# ScalyCam 机械 CAD

| 版本 | 模型与文件 | 验证状态 |
| --- | --- | --- |
| 独立支架原型 | [装配预览](prototype/assembly-preview.png) · [总装 STEP](prototype/assembly.step) · [零件 STEP](prototype/step/) · [STL](prototype/stl/) · [装配与试配说明](prototype/ASSEMBLY.md) | 8 个装配件和 2 个试配件已通过数字几何检查，实物试配待完成。 |
| 一体折叠 v3 | [设计说明](integrated-fold-h2c-v3/README.md) · [展开预览](integrated-fold-h2c-v3/deployed-cad.png) · [展开 STEP](integrated-fold-h2c-v3/deployed.step) · [合盖 STEP](integrated-fold-h2c-v3/closed.step) | 当前产品方向。四个姿态用于检查布局与折叠空间，铰链、锁扣和线束仍待细化。 |

## 重新生成模型

以下命令从仓库根目录运行。使用 Python 3.12 创建环境，安装原建模环境中的依赖版本。

```sh
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install cadquery==2.6.1 trimesh==4.8.3 vtk==9.3.1 matplotlib==3.11.2 numpy==2.5.4
```

修改 [原型参数](prototype/parameters.json) 后运行 `python docs/hardware/prototype/generate.py`。可依次运行 `python docs/hardware/prototype/render.py` 和 `python docs/hardware/prototype/render_vtk.py` 更新受力示意图及 CAD 预览。

编辑 [折叠 v3 源码](integrated-fold-h2c-v3/model.py) 后运行 `python docs/hardware/integrated-fold-h2c-v3/model.py`，重新导出四个姿态及其预览。两个生成脚本都会更新对应目录中的模型和验证记录。

## License

Copyright © 2026 zxhderifish. The ScalyCam mechanical designs in this directory, including the CadQuery sources, STEP and STL exports, previews, and documentation, are licensed under [Creative Commons Attribution-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-sa/4.0/) (SPDX: `CC-BY-SA-4.0`).
