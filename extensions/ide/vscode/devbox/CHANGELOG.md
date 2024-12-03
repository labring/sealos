# Change Log

All notable changes to the "devbox" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

## [1.2.0] - 2024-12-3

### Added

- Simple backup devbox ssh config.
- UI style optimization and some little buttons of `Database` panel and `Network` panel.
- I18n support.

### Fixed

### Changed

- remove the `devbox` control of the `Remote-SSH` config.

## [1.0.0] - 2024-11-13

### Added

- Devbox basic management: Create(in web page),Delete(delete local ssh config),Open,Refresh,State.
- Network panel,Database panel: View network and database information，open network port in browser or vscode integrated browser,copy database connection string.
- Adapt to dark theme.
- custom your own API Region and Zone.
- Delete devbox in web page will delete local ssh config.

### Fixed

- windows file authority issue cause connection error.
- Connection error caused by `Remote-SSH` custom ssh config path.

### Changed

- update ssh config file format.

### Security

- Replace `child_process` with `execa` to avoid security issues.
- Deal with path traversal attack.
