## Environment & Runtime

- **Never** suggest using the global Python interpreter on macOS.
- **Always** assume the project runs within a Conda environment.
- Use `conda activate py11` for all terminal commands and execution context.
- When suggesting package installations, use `conda install` or `pip` within the active environment.

## Coding Style

- Prefer Python 3.11+ syntax.
- Use type hinting for all function signatures.
