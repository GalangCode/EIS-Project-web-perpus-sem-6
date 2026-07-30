<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Http\Request;
use App\Http\Response;
use App\Support\Database;
use DateTimeImmutable;
use DateTime;
use PDO;
use Throwable;

final class ReportController extends BaseController
{
    public function overview(Request $request, array $context): array
    {
        $identity = $this->requireExecutive($request, $context);
        if ($this->isErrorResponse($identity)) {
            return $identity;
        }

        try {
            $pdo = Database::connection($context['database']);

            $defaultStart = new DateTimeImmutable('first day of this month');
            $defaultEnd = $defaultStart->modify('last day of this month');
            $reportStart = $this->parseDate((string) ($request->query('start_date', '') ?? '')) ?? $defaultStart;
            $reportEnd = $this->parseDate((string) ($request->query('end_date', '') ?? '')) ?? $defaultEnd;
            if ($reportStart > $reportEnd) {
                [$reportStart, $reportEnd] = [$reportEnd, $reportStart];
            }

            $requestedChartYear = (int) ($request->query('chart_year', (int) date('Y')) ?? (int) date('Y'));
            $chartYear = $requestedChartYear > 0 ? $requestedChartYear : (int) date('Y');
            $reportPeriodLabel = $this->formatDateLabel($reportStart) . ' - ' . $this->formatDateLabel($reportEnd);
            $reportStartSql = $reportStart->format('Y-m-d');
            $reportEndSql = $reportEnd->format('Y-m-d');
            $reportEndExclusiveSql = $reportEnd->modify('+1 day')->format('Y-m-d');

            $memberSummary = $this->fetchOne(
                $pdo,
                'SELECT
                    COUNT(*) AS total,
                    SUM(status = "aktif") AS active,
                    SUM(status = "nonaktif") AS inactive,
                    SUM(CASE WHEN joined_at >= :member_start_date AND joined_at < :member_end_exclusive THEN 1 ELSE 0 END) AS new_this_month
                 FROM members',
                [
                    'member_start_date' => $reportStartSql,
                    'member_end_exclusive' => $reportEndExclusiveSql,
                ]
            );

            $bookSummary = $this->fetchOne(
                $pdo,
                'SELECT
                    COUNT(*) AS total,
                    SUM(status = "aktif") AS active,
                    SUM(CASE WHEN stock_available = 0 THEN 1 ELSE 0 END) AS empty_stock,
                    SUM(CASE WHEN stock_available BETWEEN 1 AND 3 THEN 1 ELSE 0 END) AS low_stock
                 FROM books'
            );

            $categorySummary = $this->fetchOne(
                $pdo,
                'SELECT
                    COUNT(*) AS total,
                    SUM(status = "aktif") AS active,
                    SUM(status = "nonaktif") AS inactive
                 FROM categories'
            );

            $loanSummary = $this->fetchOne(
                $pdo,
                'SELECT
                    COUNT(*) AS total,
                    SUM(status = "dipinjam") AS borrowed,
                    SUM(status = "dikembalikan") AS returned_count,
                    SUM(status = "terlambat") AS overdue_count,
                    SUM(status = "dibatalkan") AS cancelled_count,
                    SUM(CASE WHEN loan_date >= :loan_start_date_case AND loan_date < :loan_end_exclusive_case THEN 1 ELSE 0 END) AS this_month
                 FROM loans
                 WHERE loan_date >= :loan_start_date_where AND loan_date < :loan_end_exclusive_where',
                [
                    'loan_start_date_case' => $reportStartSql,
                    'loan_end_exclusive_case' => $reportEndExclusiveSql,
                    'loan_start_date_where' => $reportStartSql,
                    'loan_end_exclusive_where' => $reportEndExclusiveSql,
                ]
            );

            $loanStatusBreakdown = [];
            foreach ([
                'dipinjam' => 'Dipinjam',
                'dikembalikan' => 'Dikembalikan',
                'terlambat' => 'Terlambat',
                'dibatalkan' => 'Dibatalkan',
            ] as $statusKey => $label) {
                $loanStatusBreakdown[] = [
                    'status' => $statusKey,
                    'label' => $label,
                    'count' => (int) ($loanSummary[$statusKey === 'dipinjam' ? 'borrowed' : ($statusKey === 'dikembalikan' ? 'returned_count' : ($statusKey === 'terlambat' ? 'overdue_count' : 'cancelled_count'))] ?? 0),
                ];
            }

            $topBooksRows = $this->fetchAll(
                $pdo,
                'SELECT
                    b.id,
                    b.code,
                    b.title,
                    b.status,
                    b.stock_total,
                    b.stock_available,
                    c.code AS category_code,
                    c.name AS category_name,
                    COALESCE(SUM(CASE WHEN l.id IS NOT NULL THEN li.quantity ELSE 0 END), 0) AS borrowed_quantity,
                    MAX(l.loan_date) AS last_borrowed_at
                 FROM books b
                 INNER JOIN categories c ON c.id = b.category_id
                 LEFT JOIN loan_items li ON li.book_id = b.id
                 LEFT JOIN loans l ON l.id = li.loan_id AND l.loan_date >= :topbook_start_date AND l.loan_date < :topbook_end_exclusive
                 GROUP BY b.id
                 ORDER BY borrowed_quantity DESC, b.stock_available ASC, b.title ASC
                 LIMIT 8',
                [
                    'topbook_start_date' => $reportStartSql,
                    'topbook_end_exclusive' => $reportEndExclusiveSql,
                ]
            );
            $topBooks = [];
            foreach ($topBooksRows as $index => $row) {
                $stockAvailable = (int) ($row['stock_available'] ?? 0);
                $topBooks[] = [
                    'rank' => $index + 1,
                    'id' => (int) $row['id'],
                    'code' => (string) $row['code'],
                    'title' => (string) $row['title'],
                    'category_code' => (string) ($row['category_code'] ?? ''),
                    'category_name' => (string) ($row['category_name'] ?? ''),
                    'borrowed_quantity' => (int) ($row['borrowed_quantity'] ?? 0),
                    'stock_total' => (int) ($row['stock_total'] ?? 0),
                    'stock_available' => $stockAvailable,
                    'status' => (string) $row['status'],
                    'last_borrowed_at' => $row['last_borrowed_at'],
                ];
            }

            $topCategoriesRows = $this->fetchAll(
                $pdo,
                'SELECT
                    c.id,
                    c.code,
                    c.name,
                    c.status,
                    COUNT(DISTINCT b.id) AS books_count,
                    COALESCE(SUM(CASE WHEN l.id IS NOT NULL THEN li.quantity ELSE 0 END), 0) AS borrowed_quantity
                 FROM categories c
                 LEFT JOIN books b ON b.category_id = c.id
                 LEFT JOIN loan_items li ON li.book_id = b.id
                 LEFT JOIN loans l ON l.id = li.loan_id AND l.loan_date >= :topcat_start_date AND l.loan_date < :topcat_end_exclusive
                 GROUP BY c.id
                 ORDER BY borrowed_quantity DESC, books_count DESC, c.name ASC
                 LIMIT 6',
                [
                    'topcat_start_date' => $reportStartSql,
                    'topcat_end_exclusive' => $reportEndExclusiveSql,
                ]
            );
            $topCategories = [];
            foreach ($topCategoriesRows as $index => $row) {
                $borrowedQuantity = (int) ($row['borrowed_quantity'] ?? 0);
                $booksCount = (int) ($row['books_count'] ?? 0);
                $topCategories[] = [
                    'rank' => $index + 1,
                    'id' => (int) $row['id'],
                    'code' => (string) $row['code'],
                    'name' => (string) $row['name'],
                    'status' => (string) $row['status'],
                    'books_count' => $booksCount,
                    'borrowed_quantity' => $borrowedQuantity,
                ];
            }

            $recentLoansRows = $this->fetchAll(
                $pdo,
                'SELECT
                    l.id,
                    l.loan_code,
                    l.loan_date,
                    l.due_date,
                    l.status,
                    m.full_name AS member_name,
                    GROUP_CONCAT(DISTINCT b.title ORDER BY b.title SEPARATOR ", ") AS books_summary
                 FROM loans l
                 INNER JOIN members m ON m.id = l.member_id
                 LEFT JOIN loan_items li ON li.loan_id = l.id
                 LEFT JOIN books b ON b.id = li.book_id
                 WHERE l.loan_date >= :recent_start_date AND l.loan_date < :recent_end_exclusive
                 GROUP BY l.id
                 ORDER BY l.created_at DESC, l.id DESC
                 LIMIT 6',
                [
                    'recent_start_date' => $reportStartSql,
                    'recent_end_exclusive' => $reportEndExclusiveSql,
                ]
            );
            $recentLoans = [];
            foreach ($recentLoansRows as $row) {
                $recentLoans[] = [
                    'id' => (int) $row['id'],
                    'loan_code' => (string) $row['loan_code'],
                    'member_name' => (string) $row['member_name'],
                    'loan_date' => $row['loan_date'],
                    'due_date' => $row['due_date'],
                    'status' => (string) $row['status'],
                    'books_summary' => (string) ($row['books_summary'] ?? ''),
                ];
            }

            $monthShortLabels = [
                1 => 'JAN',
                2 => 'FEB',
                3 => 'MAR',
                4 => 'APR',
                5 => 'MEI',
                6 => 'JUN',
                7 => 'JUL',
                8 => 'AGU',
                9 => 'SEP',
                10 => 'OKT',
                11 => 'NOV',
                12 => 'DES',
            ];
            $monthLongLabels = [
                1 => 'Jan',
                2 => 'Feb',
                3 => 'Mar',
                4 => 'Apr',
                5 => 'Mei',
                6 => 'Jun',
                7 => 'Jul',
                8 => 'Agu',
                9 => 'Sep',
                10 => 'Okt',
                11 => 'Nov',
                12 => 'Des',
            ];

            $monthBuckets = [];
            for ($monthIndex = 1; $monthIndex <= 12; $monthIndex++) {
                $key = sprintf('%04d-%02d', $chartYear, $monthIndex);
                $monthBuckets[$key] = [
                    'key' => $key,
                    'label' => $monthShortLabels[$monthIndex] ?? strtoupper(substr((string) $monthLongLabels[$monthIndex], 0, 3)),
                    'month_label' => ($monthLongLabels[$monthIndex] ?? $monthShortLabels[$monthIndex]) . ' ' . $chartYear,
                    'loans' => 0,
                    'books_added' => 0,
                ];
            }

            $monthlyLoanRows = $this->fetchAll(
                $pdo,
                'SELECT loan_date
                 FROM loans
                 WHERE YEAR(loan_date) = :chart_year
                 ORDER BY loan_date ASC, id ASC',
                [
                    'chart_year' => $chartYear,
                ]
            );
            foreach ($monthlyLoanRows as $row) {
                $key = substr((string) ($row['loan_date'] ?? ''), 0, 7);
                if (isset($monthBuckets[$key])) {
                    $monthBuckets[$key]['loans']++;
                }
            }

            $monthlyBookRows = $this->fetchAll(
                $pdo,
                'SELECT created_at
                 FROM books
                 WHERE YEAR(created_at) = :chart_year
                 ORDER BY created_at ASC, id ASC',
                [
                    'chart_year' => $chartYear,
                ]
            );
            foreach ($monthlyBookRows as $row) {
                $key = substr((string) ($row['created_at'] ?? ''), 0, 7);
                if (isset($monthBuckets[$key])) {
                    $monthBuckets[$key]['books_added']++;
                }
            }

            $categoryAnalysisRows = $this->fetchAll(
                $pdo,
                'SELECT
                    c.id,
                    c.code,
                    c.name,
                    c.status,
                    COUNT(DISTINCT b.id) AS books_count,
                    COALESCE(SUM(CASE WHEN l.id IS NOT NULL THEN li.quantity ELSE 0 END), 0) AS total_borrowed,
                    COALESCE(SUM(CASE WHEN l.loan_date >= DATE_SUB(:category_end_date_30, INTERVAL 30 DAY) AND l.loan_date <= :category_end_date_30b THEN li.quantity ELSE 0 END), 0) AS last_30_days,
                    COALESCE(SUM(CASE WHEN l.loan_date >= DATE_SUB(:category_end_date_60, INTERVAL 60 DAY) AND l.loan_date < DATE_SUB(:category_end_date_60b, INTERVAL 30 DAY) THEN li.quantity ELSE 0 END), 0) AS previous_30_days,
                    SUM(CASE WHEN b.stock_available = 0 THEN 1 ELSE 0 END) AS empty_stock_books,
                    SUM(CASE WHEN b.stock_available BETWEEN 1 AND 3 THEN 1 ELSE 0 END) AS low_stock_books
                 FROM categories c
                 LEFT JOIN books b ON b.category_id = c.id
                 LEFT JOIN loan_items li ON li.book_id = b.id
                 LEFT JOIN loans l ON l.id = li.loan_id AND l.loan_date >= :category_start_date AND l.loan_date < :category_end_exclusive
                 GROUP BY c.id
                 ORDER BY total_borrowed DESC, books_count DESC, c.name ASC
                 LIMIT 5',
                [
                    'category_start_date' => $reportStartSql,
                    'category_end_exclusive' => $reportEndExclusiveSql,
                    'category_end_date_30' => $reportEndSql,
                    'category_end_date_30b' => $reportEndSql,
                    'category_end_date_60' => $reportEndSql,
                    'category_end_date_60b' => $reportEndSql,
                ]
            );
            $categoryAnalysis = [];
            foreach ($categoryAnalysisRows as $row) {
                $last30 = (int) ($row['last_30_days'] ?? 0);
                $previous30 = (int) ($row['previous_30_days'] ?? 0);
                $trendPercent = $previous30 > 0 ? (int) round((($last30 - $previous30) / $previous30) * 100) : ($last30 > 0 ? 100 : 0);
                if ($trendPercent > 0) {
                    $trendText = '+' . $trendPercent . '%';
                } elseif ($trendPercent < 0) {
                    $trendText = $trendPercent . '%';
                } else {
                    $trendText = '0%';
                }

                $emptyStockBooks = (int) ($row['empty_stock_books'] ?? 0);
                $lowStockBooks = (int) ($row['low_stock_books'] ?? 0);
                if ($emptyStockBooks > 0 || $lowStockBooks > 0) {
                    $recommendation = 'PROTECT STOCK';
                } elseif ($trendPercent >= 15) {
                    $recommendation = 'EXPAND';
                } elseif ($trendPercent <= -10) {
                    $recommendation = 'REVIEW';
                } else {
                    $recommendation = 'NORMAL';
                }

                $categoryAnalysis[] = [
                    'id' => (int) $row['id'],
                    'code' => (string) $row['code'],
                    'name' => (string) $row['name'],
                    'status' => (string) $row['status'],
                    'books_count' => (int) ($row['books_count'] ?? 0),
                    'total_borrowed' => (int) ($row['total_borrowed'] ?? 0),
                    'last_30_days' => $last30,
                    'trend_percent' => $trendPercent,
                    'trend_text' => $trendText,
                    'recommendation' => $recommendation,
                ];
            }

            $memberRows = $this->fetchAll($pdo, 'SELECT birth_date FROM members ORDER BY created_at ASC, id ASC');
            $demographicBands = [
                ['label' => '15-24 Tahun', 'count' => 0, 'percent' => 0],
                ['label' => '25-34 Tahun', 'count' => 0, 'percent' => 0],
                ['label' => '35-44 Tahun', 'count' => 0, 'percent' => 0],
                ['label' => '45+ Tahun', 'count' => 0, 'percent' => 0],
            ];

            foreach ($memberRows as $row) {
                $birthDate = DateTime::createFromFormat('Y-m-d', (string) ($row['birth_date'] ?? ''));
                if (!$birthDate instanceof DateTime) {
                    continue;
                }

                $errors = DateTime::getLastErrors();
                if (is_array($errors) && (($errors['warning_count'] ?? 0) > 0 || ($errors['error_count'] ?? 0) > 0)) {
                    continue;
                }

                $age = (int) $birthDate->diff(new DateTimeImmutable('today'))->y;
                if ($age < 15) {
                    continue;
                }

                if ($age <= 24) {
                    $demographicBands[0]['count']++;
                } elseif ($age <= 34) {
                    $demographicBands[1]['count']++;
                } elseif ($age <= 44) {
                    $demographicBands[2]['count']++;
                } else {
                    $demographicBands[3]['count']++;
                }
            }

            $demographicTotal = array_sum(array_column($demographicBands, 'count'));
            foreach ($demographicBands as &$band) {
                $band['percent'] = $demographicTotal > 0 ? (int) round(($band['count'] / $demographicTotal) * 100) : 0;
            }
            unset($band);

            $executiveAgeBands = [
                ['label' => '<12', 'count' => 0, 'percent' => 0],
                ['label' => '13-17', 'count' => 0, 'percent' => 0],
                ['label' => '18-25', 'count' => 0, 'percent' => 0],
                ['label' => '26-40', 'count' => 0, 'percent' => 0],
                ['label' => '>40', 'count' => 0, 'percent' => 0],
            ];

            foreach ($memberRows as $row) {
                $birthDate = DateTimeImmutable::createFromFormat('Y-m-d', (string) ($row['birth_date'] ?? ''));
                if (!$birthDate instanceof DateTimeImmutable) {
                    continue;
                }

                $errors = DateTimeImmutable::getLastErrors();
                if (is_array($errors) && (($errors['warning_count'] ?? 0) > 0 || ($errors['error_count'] ?? 0) > 0)) {
                    continue;
                }

                $age = (int) $birthDate->diff(new DateTimeImmutable('today'))->y;
                if ($age <= 12) {
                    $executiveAgeBands[0]['count']++;
                } elseif ($age <= 17) {
                    $executiveAgeBands[1]['count']++;
                } elseif ($age <= 25) {
                    $executiveAgeBands[2]['count']++;
                } elseif ($age <= 40) {
                    $executiveAgeBands[3]['count']++;
                } else {
                    $executiveAgeBands[4]['count']++;
                }
            }

            $executiveAgeTotal = array_sum(array_column($executiveAgeBands, 'count'));
            foreach ($executiveAgeBands as &$band) {
                $band['percent'] = $executiveAgeTotal > 0 ? (int) round(($band['count'] / $executiveAgeTotal) * 100) : 0;
            }
            unset($band);

            return Response::json([
                'success' => true,
                'message' => 'Ringkasan laporan berhasil dimuat',
                'data' => [
                    'period_label' => $reportPeriodLabel,
                    'chart_year' => $chartYear,
                    'summary' => [
                        'members' => [
                            'total' => (int) ($memberSummary['total'] ?? 0),
                            'active' => (int) ($memberSummary['active'] ?? 0),
                            'inactive' => (int) ($memberSummary['inactive'] ?? 0),
                            'new_this_month' => (int) ($memberSummary['new_this_month'] ?? 0),
                        ],
                        'books' => [
                            'total' => (int) ($bookSummary['total'] ?? 0),
                            'active' => (int) ($bookSummary['active'] ?? 0),
                            'low_stock' => (int) ($bookSummary['low_stock'] ?? 0),
                            'empty_stock' => (int) ($bookSummary['empty_stock'] ?? 0),
                        ],
                        'categories' => [
                            'total' => (int) ($categorySummary['total'] ?? 0),
                            'active' => (int) ($categorySummary['active'] ?? 0),
                            'inactive' => (int) ($categorySummary['inactive'] ?? 0),
                        ],
                        'loans' => [
                            'total' => (int) ($loanSummary['total'] ?? 0),
                            'borrowed' => (int) ($loanSummary['borrowed'] ?? 0),
                            'returned_count' => (int) ($loanSummary['returned_count'] ?? 0),
                            'overdue_count' => (int) ($loanSummary['overdue_count'] ?? 0),
                            'cancelled_count' => (int) ($loanSummary['cancelled_count'] ?? 0),
                            'this_month' => (int) ($loanSummary['this_month'] ?? 0),
                        ],
                    ],
                    'monthly_loans' => [],
                    'monthly_activity' => array_values($monthBuckets),
                    'loan_status_breakdown' => $loanStatusBreakdown,
                    'top_books' => $topBooks,
                    'top_categories' => $topCategories,
                    'category_analysis' => $categoryAnalysis,
                    'demographics' => $demographicBands,
                    'executive_demographics' => $executiveAgeBands,
                    'recent_loans' => $recentLoans,
                    'generated_at' => date(DATE_ATOM),
                ],
            ]);
        } catch (Throwable $throwable) {
            return Response::json([
                'success' => false,
                'message' => 'Gagal memuat laporan',
                'error' => $throwable->getMessage(),
            ], 500);
        }
    }

    private function parseDate(string $value): ?DateTimeImmutable
    {
        $value = trim($value);
        if ($value === '') {
            return null;
        }

        $date = DateTimeImmutable::createFromFormat('Y-m-d', $value);
        if (!$date instanceof DateTimeImmutable) {
            return null;
        }

        $errors = DateTimeImmutable::getLastErrors();
        if (is_array($errors) && (($errors['warning_count'] ?? 0) > 0 || ($errors['error_count'] ?? 0) > 0)) {
            return null;
        }

        return $date;
    }

    private function formatDateLabel(DateTimeImmutable $date): string
    {
        $months = [
            1 => 'Jan',
            2 => 'Feb',
            3 => 'Mar',
            4 => 'Apr',
            5 => 'Mei',
            6 => 'Jun',
            7 => 'Jul',
            8 => 'Agu',
            9 => 'Sep',
            10 => 'Okt',
            11 => 'Nov',
            12 => 'Des',
        ];

        $monthIndex = (int) $date->format('n');
        $monthLabel = $months[$monthIndex] ?? $date->format('M');
        return $date->format('j') . ' ' . $monthLabel . ' ' . $date->format('Y');
    }

    private function fetchOne(PDO $pdo, string $sql, array $params = []): array
    {
        $statement = $pdo->prepare($sql);
        $statement->execute($params);
        $row = $statement->fetch(PDO::FETCH_ASSOC);
        return is_array($row) ? $row : [];
    }

    private function fetchAll(PDO $pdo, string $sql, array $params = []): array
    {
        $statement = $pdo->prepare($sql);
        $statement->execute($params);
        $rows = $statement->fetchAll(PDO::FETCH_ASSOC);
        return is_array($rows) ? $rows : [];
    }
}
