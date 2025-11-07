# Change Log

All notable changes to the "pydoclint" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.2.1] - 2025-11-07

### Added

- Option `pydoclint.ignoreVirtualEnv` (default: true) to skip checking files that live inside common virtual environment folders.
- Option `pydoclint.ignorePaths` (array of minimatch globs) to allow users to explicitly ignore specific paths (e.g., `**/site-packages/**`).

## [0.1.1] - 2025-09-23

### Changed

- Replaced information messages with temporary status bar messages for better user experience (thanks to @Victor-MichelDansac).

### Fixed

- Some linting.

## [0.0.1] - 2025-09-16

- Initial release
