# Third-party notices

| Component | Source / pin | License |
| --- | --- | --- |
| Rustlings exercises, hints, topic notes | [rust-lang/rustlings v6.5.0](https://github.com/rust-lang/rustlings/tree/2af9e89ba536fad01aa828b06e0ac2174bad0f6d) | [MIT](public/licenses/RUSTLINGS-MIT.txt), copyright 2016 Carol (Nichols \|\| Goulding) |
| Compiler worker and vendored WASI runtime | [AngelOnFira/weblings d0cd7a9](https://github.com/AngelOnFira/weblings/tree/d0cd7a9f3af7d8249b3948ac0e19d2afc0d01633) | [MIT](public/licenses/WEBLINGS-MIT.txt), copyright 2026 Forest Anderson |
| browser_wasi_shim | [bjorn3/browser_wasi_shim](https://github.com/bjorn3/browser_wasi_shim) (vendored through Weblings) | [MIT](public/licenses/BROWSER-WASI-SHIM-MIT.txt) / [Apache-2.0](public/licenses/BROWSER-WASI-SHIM-APACHE.txt) |
| Compiler artifact packaging | [AngelOnFira/wasm-rustc artifacts-test-7](https://github.com/AngelOnFira/wasm-rustc/releases/tag/artifacts-test-7) | [MIT](public/licenses/WASM-RUSTC-MIT.txt) |
| Rust compiler / standard library | [Rust](https://github.com/rust-lang/rust), patched toolchain built by wasm-rustc | [MIT](public/licenses/RUST-MIT.txt) / [Apache-2.0](public/licenses/RUST-APACHE.txt); dependencies retain their respective upstream licenses |
| DM Sans | [googlefonts/dm-fonts](https://github.com/googlefonts/dm-fonts), via @fontsource-variable/dm-sans | [SIL OFL 1.1](public/licenses/DM-SANS-OFL.txt) |
| IBM Plex Mono | [IBM/plex](https://github.com/IBM/plex), via @fontsource/ibm-plex-mono | [SIL OFL 1.1](public/licenses/IBM-PLEX-MONO-OFL.txt) |

The vendored compiler worker is modified to cap output and reject unsuccessful compilation even if an output file exists. Other frontend npm dependencies retain their licenses in their distributed packages; exact versions are recorded in package-lock.json.
