# ACCORE ERP cross-platform server packaging contract

## Product boundary and supported delivery paths

A server package contains the **ACCORE Server Agent**, the SHA-256-verified embedded runtime, the Laravel application payload, and the native service definition required by its host operating system. The desktop client is a control surface: it does not spawn MariaDB, FrankenPHP, or the queue directly. Lifecycle operations always pass through the agent, which records a single owner for the protected server instance and prevents one product flavor from silently taking over another.

| Platform                      | Server Desktop delivery                                              | Headless delivery     | Native service manager          | Durable private data root                        |
| ----------------------------- | -------------------------------------------------------------------- | --------------------- | ------------------------------- | ------------------------------------------------ |
| Windows x64                   | Tauri MSI/NSIS bundle with embedded runtime                          | Silent NSIS installer | Windows Service Control Manager | `%ProgramData%\ACCORE ERP\Server`                |
| Linux x64                     | System-native Tauri DEB/RPM; portable AppImage is attach/status only | DEB, RPM, and tarball | systemd                         | `/var/lib/accore-erp/server`                     |
| macOS Apple Silicon and Intel | Tauri application installed by an administrator in `/Applications`   | Unsigned PKG          | launchd LaunchDaemon            | `/Library/Application Support/ACCORE ERP/Server` |

> **Portable desktop safety boundary.** A desktop bundle may request elevation only for a root-owned, non-group-writable agent. Consequently, an AppImage copied to an arbitrary user-writable directory and a macOS application executed from a DMG or Downloads folder cannot claim a service. They can attach to an already installed Headless service and read its public status. This is deliberate: an untrusted executable must never receive administrator privileges.

## Ownership, privilege, and lifecycle contract

The first successful `claim` or Headless installation writes the server-instance receipt. The receipt identifies whether the protected instance belongs to **Server Desktop** or **Server Headless**. A Server Desktop application attaches to a Headless-owned service instead of replacing it; an ownership transfer requires the explicit, elevated transition operation. Service removal is similarly owner-aware and idempotent.

| Operation                             | Windows                                                                           | Linux                                                                                                                                            | macOS                                                                                                                                                         |
| ------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Install or claim                      | Elevated agent configures the SCM service.                                        | A root-owned agent invokes the native system integration through `pkexec`; native DEB/RPM delivery is required for a new Desktop-owned instance. | A root-owned agent is authorized through the standard administrator prompt; the Desktop application must be installed in `/Applications` by an administrator. |
| Attach to an existing Headless server | Agent records a Desktop control-surface attachment without replacing the service. | Same, using the installed Headless agent at `/opt/accore-erp/server`.                                                                            | Same, using the installed Headless agent at `/Library/ACCORE ERP/Server`.                                                                                     |
| Run service                           | SCM supervises the agent.                                                         | A `Type=exec` unit runs as the dedicated `accore` account.                                                                                       | A root-owned LaunchDaemon keeps the foreground agent alive.                                                                                                   |
| Public monitoring                     | Read-only status under `%ProgramData%\ACCORE ERP\Server Status`.                  | Read-only status under `/var/lib/accore-erp/Server Status`.                                                                                      | Read-only status under `/Library/Application Support/ACCORE ERP/Server Status`.                                                                               |

Linux private data is owned by the `accore` system account; systemd uses `NoNewPrivileges`, `PrivateTmp`, `ProtectSystem=strict`, `ProtectHome`, a restrictive `UMask`, and explicit writable paths. The macOS plist is written beneath `/Library/LaunchDaemons`, owned by `root:wheel`, and mode `0600`. The agent runs in the foreground because launchd, like systemd, is the process supervisor rather than the application itself.[1] [2]

## Runtime discovery and self-containment

The package contains no Node.js, Rust toolchain, PHP installation, Homebrew installation, or database administration tool requirement for the end-user machine. Tauri resources are resolved as `resources/server-runtime/<target>` where available. The agent also recognizes the macOS application layout, in which the executable is in `Contents/MacOS` and packaged resources are in `Contents/Resources`.

| Runtime target                   | Embedded FrankenPHP | Embedded MariaDB root                 | Required database executables                                               |
| -------------------------------- | ------------------- | ------------------------------------- | --------------------------------------------------------------------------- |
| `windows-x86_64`                 | `frankenphp.exe`    | `mariadb-11.4.9-winx64`               | `mariadbd.exe`, `mariadb.exe`, `mariadb-dump.exe`, `mariadb-install-db.exe` |
| `linux-x86_64`                   | `frankenphp`        | `mariadb-11.4.9-linux-systemd-x86_64` | `mariadbd`, `mariadb`, `mariadb-dump`, `scripts/mariadb-install-db`         |
| `macos-aarch64` / `macos-x86_64` | `frankenphp`        | `mariadb`                             | `mariadbd`, `mariadb`, `mariadb-dump`, `scripts/mariadb-install-db`         |

The backup and isolated restore-validation paths use these platform-specific executable names. A runtime that lacks any required executable is rejected before the agent claims or starts a service.

## Runtime supply chain and macOS linkage policy

All downloaded source and binary archives are version-pinned and verified against a SHA-256 digest before extraction. Linux uses the upstream FrankenPHP binary and MariaDB systemd binary tarball. macOS uses the upstream FrankenPHP binary and builds MariaDB 11.4.9 from the verified source archive in a fresh out-of-source CMake directory.

The macOS MariaDB build uses the bundled TLS, PCRE, and zlib implementations and disables RocksDB with `PLUGIN_ROCKSDB=NO`, together with optional engines and components not needed by ACCORE ERP. This retains the required InnoDB, Aria, and MyISAM capabilities while avoiding optional native dependencies. MariaDB plugin options use the `PLUGIN_<name>=NO` form; `WITH_ROCKSDB=OFF` is not a valid substitute for disabling the RocksDB storage engine.[3] [4]

After the macOS runtime is staged, the build runs `otool -L` over FrankenPHP, the required MariaDB executables, and bundled dynamic libraries. It rejects dependencies that point to Homebrew, Xcode, Command Line Tools, or other build-machine paths; only macOS system libraries and package-relative loader, executable, or rpath install names are accepted. The build tools may be present on CI, but their libraries must never become an undeclared end-user dependency.

## Signing and release caveat

Windows release signing and Tauri updater signing use release secrets when they are configured. **macOS packages are currently unsigned and unnotarized** because no Apple Developer ID or notarization credentials are available. The pipeline must state this fact in release notes and must not claim seamless Gatekeeper installation. The internal runtime integrity checks above are additional safeguards; they are not a replacement for Apple code signing or notarization.

## References

[1] [systemd.service — Type=exec and service process semantics](https://www.freedesktop.org/software/systemd/man/systemd.service.html)

[2] [Apple — Creating Launch Daemons and Agents](https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingLaunchdJobs.html)

[3] [MariaDB — Compiling MariaDB from source](https://mariadb.com/kb/en/compiling-mariadb-from-source/)

[4] [MariaDB 11.4.9 source — RocksDB CMake plugin gate](https://github.com/MariaDB/server/blob/mariadb-11.4.9/storage/rocksdb/CMakeLists.txt)
