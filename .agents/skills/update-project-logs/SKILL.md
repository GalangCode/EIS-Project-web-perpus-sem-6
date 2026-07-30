---
name: update-project-logs
description: >-
  Use this skill to update the CONVERSATION_LOG.md and HANDOFF_NOTES.md files
  in Indonesian language whenever any change is made to the workspace files.
---

# Update Project Logs Skill

This skill defines the procedure for updating `CONVERSATION_LOG.md` and `HANDOFF_NOTES.md` after making changes to the project files.

## When to Use
Use this skill whenever you complete a task or make any edits, creations, or deletions of files in this project. You must do this before concluding your turn or declaring the task finished.

## Procedure

### 1. Update CONVERSATION_LOG.md
- Open [CONVERSATION_LOG.md](file:///C:/xampp/htdocs/EIS-Project web perpus sem-6/CONVERSATION_LOG.md) and find the last prompt number.
- Add a new heading with the incremented prompt number in Indonesian, e.g. `## 56) Prompt kelima puluh enam: [Singkat Topik]` (using Indonesian cardinal numbers like `kelima puluh enam`, `kelima puluh tujuh`, etc.).
- List the user request under `User meminta:`.
- List the actions and outcomes under `Hasil:`.
- Maintain the Indonesian language format.

### 2. Update HANDOFF_NOTES.md
- Open [HANDOFF_NOTES.md](file:///C:/xampp/htdocs/EIS-Project web perpus sem-6/HANDOFF_NOTES.md).
- Update the date/time of the log if necessary.
- Update "File penting yang terakhir berubah" list to include all files changed in this turn, including `HANDOFF_NOTES.md` and `CONVERSATION_LOG.md`.
- Add a new section for the feature/change made in this turn, describing:
  - **Status**: The current state of the feature.
  - **Perubahan**: Bullet points of changes made.
  - **Catatan**: Any important constraints, tips, or future work.
- Maintain the Indonesian language format.
