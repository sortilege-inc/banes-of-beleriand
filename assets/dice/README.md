# assets/dice, assets/icons — where the dice and icons come from

The dice faces, the rules glyphs and the special-result icons are taken from the
**Foundry VTT system for *The One Ring* 2nd edition** (`tor2e` 6.2.1, Hervé Darritchon,
<https://gitlab.com/herve.darritchon/foundryvtt-tor2e>), fetched from the system as installed
on the owner's Foundry server on 2026-09-25. That system is under the MIT licence (below); its
README says it ships "no game content or images" of Free League's.

| Here | From the Foundry system (`assets/images/…`) | Changed |
|---|---|---|
| `dice/feat-1.png` … `feat-10.png`, `feat-eye.png`, `feat-rune.png` | `chat/dice_icons/chat_f_1.png` … `chat_f_10.png`, `chat_f_eye.png`, `chat_f_gandalf.png` | renamed |
| `dice/success-1.png` … `success-6.png` | `chat/dice_icons/chat_s_1.png` … `chat_s_6.png` | renamed |
| `dice/success-1-weary.png` … `success-3-weary.png` | `chat/dice_icons/chat_s_1_w.png` … `chat_s_3_w.png` (the faces a Weary hero counts as zero) | renamed |
| `icons/gandalf-rune.png`, `icons/eye-of-sauron.png` | `dice/f_gandalf.png`, `dice/f_eye.png` | renamed |
| `icons/success.png` | `dice/s_6.png` | the Success rune alone, cut from the 6 |
| `icons/favicon.png` (64 px), `icons/apple-touch-icon.png` (180 px) | `chat/dice_icons/chat_f_gandalf.png` | resized |
| `icons/special/heavy-blow.svg`, `fend-off.svg`, `piercing-blow.svg`, `shield-thrust.svg` | `icons/combat/special-results/*.svg` | background square and "+" badge removed; drawn as masks |
| `icons/special/inspired.svg` | `icons/miscellaneous/inspired.svg` | background square removed |

The five SVGs are in game-icons.net's export format (a black rounded square behind a white
figure); game-icons.net publishes its icons under CC BY 3.0. The files carry no author, so the
credit here is to game-icons.net and its contributors.

## MIT licence (the Foundry tor2e system)

MIT License

Copyright (c) 2021 hervé DARRITCHON (herveDarritchon)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
