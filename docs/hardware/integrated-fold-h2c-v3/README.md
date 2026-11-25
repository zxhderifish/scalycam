# ScalyCam Integrated Fold v3 for the Bambu Lab H2C

The long arm in the earlier design was vulnerable to pressure and awkward to carry. In v3, the shorter arm sections fold into the base and stay attached during packing. The earlier single-pivot design remains a historical reference.

## Design decisions

- The base, two arm sections, camera head, and protective lid stay connected throughout folding. The internal wiring also stays connected.
- The arm pivots at the base and elbow. The camera head is fixed to the upper arm. Folding requires neither external hand knobs nor an extra crossarm or camera pivot.
- The protective lid hinges to the base and encloses the folded arms. Its support rests on the base perimeter to keep packing loads off the weighing platform.
- Packing takes three steps. Fold the upper arm, fold the lower arm, then close the lid. The device runs from external USB power. Disconnect the external cable before packing.

## Dimensions and components

The rounded base measures approximately 210 × 220 mm. The closed enclosure is about 100 mm high, roughly the size of a deep lunchbox. This height leaves space to protect the lens and weighing mechanism. The feet, latch, and finished hinge geometry may change the final dimensions.

When deployed, the lower arm stands vertically and the upper arm tilts forward at 35°. The fixed camera mount points the lens down. Both arms are 155 mm long and offset laterally by 40 mm so they can fold side by side. The lid opens 110° to the rear and needs clearance behind the base.

| Component | Placement and design requirements |
| --- | --- |
| Controller and camera | Share a compartment at the top. The nominal XIAO ESP32-S3 Sense board stack is 21 × 17.8 × 15 mm and uses its existing camera ribbon cable. The preliminary camera housing envelope is 46 × 40 × 32 mm, with a service cover and lens opening. |
| Antenna | A 6 × 30 × 3 mm space is reserved in the plastic camera head. Adjust this space to suit the actual antenna. |
| Load cell | Inside the base. The seller's nominal dimensions are 76 × 13.5 × 13.5 mm. The fixed end attaches to the base and the live end supports the floating platform. |
| HX711 | Reserve 40 × 25 × 12 mm in a separate area at the back of the base. Keep the signal leads between the load cell and amplifier short, with enough slack to avoid pulling on the cell. |
| Weighing platform | 140 × 140 mm, with its top at 38 mm. The load cell carries the platform load. The stowed arms sit above the platform with clearance. |
| USB power | The design calls for a fixed side port on the base and an internal 5 V supply lead or USB extension to the XIAO at the top. The connector and harness still need to be selected. Keep the 5 V supply off the 3V3 pin. |
| Wiring harness | Route HX711 3V3/GND/DT/SCK and power through channels in the arms. The manufacturing design calls for removable channel covers and protected service loops at both pivots, clear of the lock-pin pinch points. The CAD sweep currently excludes the harness. |
| Battery | Battery selection is pending. The current design assumes external USB power. |

## Folding and locking

1. Support the camera head, press the elbow release, and fold the upper arm back alongside the lower arm.
2. Support the folded arms, press the base release, and lower both arms forward into the base. The camera head stows in the protected area at the rear.
3. Close and latch the attached lid. Reverse the sequence to deploy the camera.

The locking concept uses metal locating pins and mechanical stops to carry loads. The pins should engage automatically at the intended positions, and the release buttons should only retract them. **The pins, springs, stops, and load-bearing elbow link still need mechanical design.** The current CAD reserves space for the pivot and release mechanisms. The design does not rely on knob friction or thin plastic catches for structural locking.

## CAD files and validation

The geometry was checked before the concept rendering was made. All four poses share the same parts and rotation transforms.

- [Deployed STEP](deployed.step) · [Deployed preview](deployed-cad.png)
- [Upper arm folded STEP](head_folded.step) · [Upper arm folded preview](head_folded-cad.png)
- [Both arms stowed STEP](arms_stowed.step) · [Both arms stowed preview](arms_stowed-cad.png)
- [Lid closed STEP](closed.step) · [Lid closed preview](closed-cad.png)
- [Product appearance concept](product-concept-en.png)
- [CadQuery source](model.py) · [Validation results](validation.json)

The first sweep found that the folded camera head touched the weighing platform and that the lid could hit the lower shell. The arm pivot was raised by 10 mm and the lid pivot was moved to the rear edge before running the checks again.

The sweep checked 72 sampled poses across upper-arm rotation from 35° to 180°, lower-arm rotation from 0° to 90°, and lid rotation from −110° to 0°. It found no positive-volume interference between the checked moving arms or camera and the platform, base components, or lid. The two arms were also checked against each other. In the closed pose, all moving component envelopes fit inside the protective lid. Every modeled solid passed the validity check.

The nominal lens-to-platform distance is about 287 mm, with about 9 mm of front-to-back offset from the platform center. Field of view and focus need physical testing. The H2C build volume has room for the base, lid, and shorter arm sections as separate parts, beyond the earlier 180 mm single-part design limit. Slicing and test printing are pending.

**These files describe component placement and folding geometry. Manufacturing validation is pending.** The checks still need detailed pivot mounts and latch interfaces, a continuous motion sweep, cable bend checks, actual component tolerances, USB voltage-drop measurements, transport loads, tip resistance, fatigue, and camera framing tests. Treat STEP bodies marked `ENVELOPE` or `RESERVED` as packaging references. A closed CAD pose establishes geometric fit. Compression in a packed bag still needs physical testing.

## Work before fabrication

Detail the load paths through both locking pins and the elbow link. Add removable cable covers, strain relief around the pivots, and the internal USB connection. Make fit coupons for the joints and components. Verify the camera height with the actual lens before completing the parts and test-printing them on the H2C. Use the existing hardware and keep unconfirmed dimensions adjustable until the relevant components can be measured.

- [Bambu Lab H2C specifications](https://blog.bambulab.com/bambu-lab-h2c-where-multi-material-vortek-system-meets-engineering-precision/)
- [Seeed Studio XIAO ESP32-S3 Sense specifications](https://wiki.seeedstudio.com/xiao_esp32s3_getting_started/)
