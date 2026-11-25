# ScalyCam printable prototype assembly guide

This engineering prototype is ready for fit testing. The CAD solids, watertight STL meshes, 180 mm build envelope, and assembled-part interference have been checked digitally. Printing, actual hole spacing, lens position, load capacity, stiffness, focus, and tip resistance still need physical validation.

## Print the two fit coupons first

Print [the load cell fit coupon](stl/fit_coupon_load_cell.stl) and [the XIAO fit coupon](stl/fit_coupon_xiao.stl) and compare them with your components. The load cell model uses the seller's nominal dimensions of 76 × 13.5 × 13.5 mm and 15 mm hole spacing at each end. The outer holes are assumed to be 5 mm from the ends, and the M4/M5 end assignment still needs verification. Kits labeled “5 kg HX711” can vary in hole position and thread size.

The camera board envelope is 21 × 17.8 × 15 mm, with the lens facing down. Support the board with an insulating pad and secure its edges with cable ties. Keep pressure off exposed solder joints and keep the lens, antenna, and connector clear. Check the openings before printing the full stand.

## Printed parts

| File | Quantity | Function |
| --- | ---: | --- |
| `scale_base.stl` | 1 | Mounts the fixed end of the load cell and holds the HX711. |
| `top_plate_USE_A_DISH.stl` | 1 | Attaches to the live end of the load cell and supports a separate dish. |
| `stand_base.stl` | 1 | Camera stand base, separate from the scale. |
| `pillar_lower.stl`, `pillar_middle.stl`, `pillar_upper.stl` | 1 each | Three pillar segments that bolt together at overlap joints. |
| `camera_arm.stl` | 1 | Cantilever at the top of the stand. |
| `camera_cradle.stl` | 1 | Open camera mount. |

The STL files use the suggested print orientations, with each part placed at Z=0. The STEP files retain the design coordinates for CAD editing. For assembly positions, use the STEP model. Every STL has a maximum dimension below 180 mm.

For an initial test print, start at 0.2 mm layer height, four walls, and 30–40% infill. The pillar segments are already oriented horizontally. Review the sliced layers at the overlap steps and check whether the cantilever needs support. These settings are starting values for fit testing. Structural strength still needs testing.

## Fasteners and supplies

The suggested lengths come from the CAD model. Measure the actual hole depths before fitting fasteners to the load cell. A screw that bottoms out can damage the cell.

| Item | Quantity | Location and sizing |
| --- | ---: | --- |
| M5 × 10 socket-head cap screw | 2 | Fixed end at the scale base, with 4 mm of load-bearing plastic and about 6 mm of thread engagement. |
| M4 × 12 socket-head cap screw | 2 | Live end at the platform, through 7 mm of plastic with about 5 mm of thread engagement. |
| M4 × 55 bolt and nut | 4 sets | Two each at the bottom and top pillar sockets, approximately 44 mm wide. |
| M4 × 35 bolt and nut | 4 sets | Two per pillar overlap joint, approximately 24 mm thick. |
| M4 × 45 bolt and nut | 2 sets | Camera cradle to cantilever, with about 34 mm of clamped thickness. |
| M4 flat washer | 20 | Use on both sides of the stand's through-holes. At the platform counterbores, use washers that fit the recess. |
| Small cable ties, insulating pads, and non-slip feet | As needed | Secure the boards, relieve cable strain, and keep the bases from slipping. |

Use through-bolts with metal nuts for the stand. Avoid using the structural fasteners as self-tapping screws in the printed plastic. The camera and HX711 use cable ties and require no precision PCB mounting holes.

## Assembly

1. Attach the fixed end of the load cell to the scale base and leave the other end free. The design leaves 6 mm below the load cell. Keep the strain gauges, wiring, and moving end clear of the housing.
2. Attach the platform to the live end of the load cell. The lowest stiffening rib has 2.5 mm of clearance above the housing rim. Keep the platform and dish clear of the rim and omit corner support feet, so the load passes through the sensor.
3. Place the HX711 on an insulating pad at the rear of the scale base and secure it through the cable-tie slots. Leave enough slack to keep the wires from pulling on the load cell.
4. Fit the lower pillar into the camera stand base and install two through-bolts. Install the middle and upper segments with two bolts per overlap joint, then attach the cantilever and camera cradle.
5. Place the stand behind the scale and leave at least 10 mm between the bases. Secure the USB and sensor cables along the outside of the pillar for strain relief. Keep them clear of the platform and avoid tying the two bases tightly together.
6. Power on with an empty platform. Check the image and make sure the USB plug and antenna are unobstructed. The nominal lens-to-platform distance is 320 mm. Verify focus and dish coverage with the actual camera.

## Hardware acceptance checks

- Check hole spacing, which thread is at each end of the load cell, thread engagement, camera fit, openings, and USB access.
- Check that the platform clears the housing when unloaded and under 100 g, 500 g, and 1,000 g loads. Start with the smallest load. The sensor's 5 kg rating applies to the sensor. Printed-part load capacity still needs testing.
- Repeat center and corner load measurements and check the return to zero after unloading. Run at least 10 repeatability trials and check drift after 30 minutes.
- Check camera focus and full dish coverage under actual lighting. Lightly touch the stand to observe wobble and recovery, and verify that the base resists tipping.
- Verify that rebooting does not automatically tare the scale. Check that offline photos stay queued on the device and are removed only after successful saving on reconnection.

Edit [`parameters.json`](parameters.json) and [`generate.py`](generate.py) to change the design. The individual STEP files and [assembly STEP](assembly.step) are included. Set up the [CAD environment](../README.md#regenerate-the-models), then run `python generate.py` from this directory. To refresh the load-path diagram, run `python render.py`. Run `python render_vtk.py` last to leave the rendered CAD assembly as the preview image.
