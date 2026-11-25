# ScalyCam mechanical CAD

| Version | Models and files | Validation status |
| --- | --- | --- |
| Separate-stand prototype | [Assembly preview](prototype/assembly-preview.png) · [Assembly STEP](prototype/assembly.step) · [Part STEP files](prototype/step/) · [STL files](prototype/stl/) · [Assembly and fit-check instructions](prototype/ASSEMBLY.md) | Digital geometry checks passed for eight assembly parts and two fit coupons. Physical fit checks are pending. |
| Integrated Fold v3 | [Design notes](integrated-fold-h2c-v3/README.md) · [Deployed preview](integrated-fold-h2c-v3/deployed-cad.png) · [Deployed STEP](integrated-fold-h2c-v3/deployed.step) · [Closed STEP](integrated-fold-h2c-v3/closed.step) | Current design direction. Four poses illustrate the layout and folding clearances. Hinges, latches, and cable routing still need detailed design. |

## Regenerate the models

Run these commands from the repository root. Use Python 3.12 and the dependency versions from the original modeling environment.

```sh
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install cadquery==2.6.1 trimesh==4.8.3 vtk==9.3.1 matplotlib==3.11.2 numpy==2.5.4
```

Edit the [prototype parameters](prototype/parameters.json) and run `python docs/hardware/prototype/generate.py`. To update the load-path diagram and CAD preview, run `python docs/hardware/prototype/render.py`, then `python docs/hardware/prototype/render_vtk.py`.

Edit the [Integrated Fold v3 source](integrated-fold-h2c-v3/model.py) and run `python docs/hardware/integrated-fold-h2c-v3/model.py` to export all four poses and regenerate their previews. Both model generation scripts update their respective exports and validation reports in place.

## License

Copyright © 2026 zxhderifish. The ScalyCam mechanical designs in this directory, including the CadQuery sources, STEP and STL exports, previews, and documentation, are licensed under [Creative Commons Attribution-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-sa/4.0/) (SPDX: `CC-BY-SA-4.0`).
