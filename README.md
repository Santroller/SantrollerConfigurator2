# Santroller Configurator 2

https://dev.santroller.com

## Reloading profiles with a button

Choose **Reload Profiles** from an input's **Output** actions to recheck **Hold Button at Startup**
conditions without power cycling. For example, map PS to this action, hold the button that selects
the desired profile, then hold PS for more than one second. The previous startup selection is
forgotten and the buttons currently held select the profile again. With no matching button held,
the usual fallback profile can take over.

Add the reload action to each profile you want to switch from. Release PS before using it again;
keeping it held through a reload does not repeatedly reload. USB or Bluetooth may reconnect if the
new profile changes the emulated device. **Restart USB / Bluetooth** remains a separate action and
does not reselect profiles.

## Desktop app

The same configurator is also packaged as a desktop app with [Tauri](https://tauri.app), for
browsers without WebHID. It needs [Rust](https://rustup.rs) and, on Linux, the
[Tauri prerequisites](https://tauri.app/start/prerequisites/).

- `yarn tauri:dev` runs it against the dev server
- `yarn tauri:build` builds an installer into `src-tauri/target/release/bundle`

On Linux the `.deb` and `.rpm` install a udev rule so controllers can be configured without root.
With the AppImage, copy `public/70-santroller.rules` to `/etc/udev/rules.d/` yourself.

Every push to `main` is released: the release workflow builds it for Linux, Windows and macOS and
publishes the installers once all three have built.

### Updates

The desktop app checks for a newer release when it starts (and every few hours), and offers to
install it. Releases are signed for this with a key kept in the repo's secrets:

- `TAURI_SIGNING_PRIVATE_KEY`: the contents of the private key
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`: its password, if it has one

The app only installs updates signed by the key whose public half is in `src-tauri/tauri.conf.json`,
so keep a backup of the private key. Without it, installed copies can't be updated anymore, and
people would have to download the next release by hand.

## Versions

The configurator is versioned `major.minor.commits`: `major.minor` comes from `package.json`, and
the last number is how many commits the repo has, so it goes up with every release
(`node scripts/version.mjs` prints it). The firmware reports its own commit count as a build
number next to its commit hash, so the configurator can tell firmware newer than the one it ships
apart from older firmware, and won't offer to downgrade it.
 