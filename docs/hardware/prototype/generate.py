#!/usr/bin/env python3
"""Editable CadQuery source. Millimetres. Never starts a printer.
Regenerate with python generate.py in the CAD environment described in ../README.md.
Actual hardware dimensions and mechanical safety remain unverified.
"""
from pathlib import Path
import json, math, hashlib
import cadquery as cq
import trimesh

ROOT = Path(__file__).resolve().parent
P = json.loads((ROOT/'parameters.json').read_text())
D, S = P['design'], P['documented']

def box(x,y,z,at=(0,0,0)):
    return cq.Workplane('XY').box(x,y,z,centered=(True,True,False)).translate(at)
def zhole(x,y,z,d,h):
    return cq.Workplane('XY').circle(d/2).extrude(h).translate((x,y,z))
def xhole(x,y,z,d,h):
    return cq.Workplane(cq.Plane(origin=(x,y,z),xDir=(0,1,0),normal=(1,0,0))).circle(d/2).extrude(h)
def yhole(x,y,z,d,h):
    return cq.Workplane(cq.Plane(origin=(x,y,z),xDir=(1,0,0),normal=(0,1,0))).circle(d/2).extrude(h)
def yztriangle(points,x,width):
    return cq.Workplane(cq.Plane(origin=(x,0,0),xDir=(0,1,0),normal=(1,0,0))).polyline(points).close().extrude(width)
def xztriangle(points,y,depth):
    return cq.Workplane(cq.Plane(origin=(0,y,0),xDir=(1,0,0),normal=(0,-1,0))).polyline(points).close().extrude(depth)

cell_l,cell_w,cell_h=S['cell_envelope_mm']
end=D['cell_end_hole_margin'];pitch=S['cell_hole_pitch_mm']
fixed_x=[-cell_l/2+end,-cell_l/2+end+pitch]
free_x=[cell_l/2-end-pitch,cell_l/2-end]
fixed_center=sum(fixed_x)/2;free_center=sum(free_x)/2
cell_z=D['base_floor']+D['fixed_spacer']
tray_z=cell_z+cell_h+D['free_spacer']
tray_top=tray_z+D['tray_thickness']

# Bottom-mounted fixed end. Clear space beneath the bending beam and free end.
base=box(D['base_size'],D['base_size'],D['base_height']).edges('|Z').fillet(5)
base=base.cut(box(D['base_size']-2*D['base_wall'],D['base_size']-2*D['base_wall'],D['base_height'],(0,0,D['base_floor'])))
base=base.union(box(pitch+12,20,D['fixed_spacer'],(fixed_center,0,D['base_floor'])))
for x in fixed_x:
    base=base.cut(zhole(x,0,-1,D['fixed_clearance_dia'],cell_z+2))
    base=base.cut(zhole(x,0,-1,10.5,7)) # 6mm underside counterbore, 4mm bearing web remains.
# HX711 insulating-pad area and cable ties, kept clear of flexing beam.
for x in (-18,18):
    for y in (36,52): base=base.cut(box(5,2,D['base_floor']+2,(x,y,-1)))
base=base.cut(box(9,8,8,(0,D['base_size']/2,D['base_height']-7)))
for x in (-7,7): base=base.cut(yhole(x,D['base_size']/2-5,14,3,10))

# Top is carried only by the free end. No feet or rigid corner contacts.
tray=box(D['tray_size'],D['tray_size'],D['tray_thickness']).edges('|Z').fillet(4)
tray=tray.union(box(pitch+12,20,D['free_spacer'],(free_center,0,-D['free_spacer'])))
for y in (-40,40): tray=tray.union(box(126,3,D['tray_rib_depth'],(0,y,-D['tray_rib_depth'])))
tray=tray.union(box(3,126,D['tray_rib_depth'],(-40,0,-D['tray_rib_depth'])))
for x in free_x:
    tray=tray.cut(zhole(x,0,-D['free_spacer']-1,D['free_clearance_dia'],D['free_spacer']+D['tray_thickness']+2))
    tray=tray.cut(zhole(x,0,D['tray_thickness']-4,8.5,5))

# Independent stand. Local base front y=0; assembly translation places it 10mm behind scale.
pw,pd=D['pillar_width'],D['pillar_depth'];clearance=D['socket_clearance'];bolt=D['bolt_clearance']
base_front=D['stand_front_y'];py=D['pillar_y']-base_front
stand=box(D['stand_width'],D['stand_depth'],D['stand_floor'],(0,D['stand_depth']/2,0)).edges('|Z').fillet(6)
stand=stand.union(box(pw+12,pd+12,40,(0,py,D['stand_floor'])))
stand=stand.union(yztriangle([(py+pd/2+6,8),(py+pd/2+6,44),(py+pd/2+70,8)],-4,8))
for sign in (-1,1):
    stand=stand.union(xztriangle([(sign*(pw/2+6),8),(sign*(pw/2+6),44),(sign*68,8)],py+4,8))
stand=stand.cut(box(pw+clearance,pd+clearance,45,(0,py,D['stand_floor'])))
for z in (20,34): stand=stand.cut(xhole(-pw/2-10,py,z,bolt,pw+20))
# Shallow rear recess for optional secured ballast; never loose over the weighing platform.
stand=stand.cut(box(95,35,3,(0,138,5)))

# Three short segments avoid requiring a >180mm print bed; two keyed half-lap joints.
# Arm socket roof at local z36; cradle top z32; assumed lens at cradle bottom+3.
pillar_total=tray_top+D['camera_working_height']-D['stand_floor']+36-32+D['cradle_height']-D['assumed_lens_plane_z']
segment=(pillar_total+2*D['joint_overlap'])/3
lap=D['joint_overlap'];gap=D['joint_gap']
def pillar(kind):
    part=box(pw,pd,segment)
    if kind!='lower': # bottom tongue is the front half
        part=part.cut(box(pw+2,pd/2+gap/2,lap,(0,pd/4-gap/4,0)))
        for z in (8,22): part=part.cut(yhole(0,-pd/2-1,z,bolt,pd+2))
    if kind!='upper': # top tongue is the back half
        part=part.cut(box(pw+2,pd/2+gap/2,lap+1,(0,-pd/4+gap/4,segment-lap)))
        for z in (segment-lap+8,segment-lap+22): part=part.cut(yhole(0,-pd/2-1,z,bolt,pd+2))
    if kind=='lower':
        for z in (12,26): part=part.cut(xhole(-pw/2-1,0,z,bolt,pw+2))
    if kind=='upper':
        for z in (segment-24,segment-10): part=part.cut(xhole(-pw/2-1,0,z,bolt,pw+2))
    # External tether tie holes; route wire outside the joints and moving tray.
    for z in (55,90): part=part.cut(xhole(-pw/2-1,0,z,3,pw+2))
    return part

reach=D['pillar_y'];arm=box(pw+12,pd+12,40)
arm=arm.union(box(30,reach,12,(0,-reach/2,32)))
arm=arm.union(box(64,42,12,(0,-reach,32)))
arm=arm.union(yztriangle([(-pd/2,32),(-pd/2,8),(-reach+20,32)],-4,8))
arm=arm.cut(box(pw+clearance,pd+clearance,37,(0,0,-1)))
for z in (12,26): arm=arm.cut(xhole(-pw/2-10,0,z,bolt,pw+20))
for x in (-24,24): arm=arm.cut(zhole(x,-reach+12,31,bolt,14))
for y in (-40,-75): arm=arm.cut(zhole(0,y,31,3,14))

# Open cradle: no sealed box, optical aperture and USB path accessible on both x sides.
cradle=box(60,40,3)
cradle=cradle.cut(box(D['lens_aperture_x'],D['lens_aperture_y'],5,(D['lens_offset_x'],D['lens_offset_y'],-1)))
for x in (-13.5,13.5):
    for y in (-11,11): cradle=cradle.union(box(3,3,16,(x,y,3)))
for x in (-24,24):
    cradle=cradle.union(zhole(x,12,3,11,D['cradle_height']-3))
    cradle=cradle.cut(zhole(x,12,-1,bolt,D['cradle_height']+2))
for x in (-17,17): cradle=cradle.cut(box(3,7,5,(x,0,-1)))
# Zip tie passes through these slots over PCB edges without covering lens or antenna connector.

coupon=box(65,30,6)
for x,d in ((-22,4.5),(-7,5.5)):
    for y in (-pitch/2,pitch/2): coupon=coupon.cut(zhole(x,y,-1,d,8))
coupon=coupon.cut(box(cell_w+0.6,32,3,(20,0,3)))
board_coupon=box(30,26,3)
board_coupon=board_coupon.cut(box(17,14,5,(0,0,-1)))
for x in (-13.5,13.5):
    for y in (-11,11): board_coupon=board_coupon.union(box(3,3,8,(x,y,3)))

parts={'scale_base':base,'top_plate_USE_A_DISH':tray,'stand_base':stand,
       'pillar_lower':pillar('lower'),'pillar_middle':pillar('middle'),'pillar_upper':pillar('upper'),
       'camera_arm':arm,'camera_cradle':cradle,'fit_coupon_load_cell':coupon,'fit_coupon_xiao':board_coupon}
placements={'scale_base':(0,0,0),'top_plate_USE_A_DISH':(0,0,tray_z),'stand_base':(0,base_front,0),
 'pillar_lower':(0,D['pillar_y'],D['stand_floor']),
 'pillar_middle':(0,D['pillar_y'],D['stand_floor']+segment-lap),
 'pillar_upper':(0,D['pillar_y'],D['stand_floor']+2*(segment-lap)),
 'camera_arm':(0,D['pillar_y'],D['stand_floor']+pillar_total-36),
 'camera_cradle':(0,0,D['stand_floor']+pillar_total-36+32-D['cradle_height'])}

stl_dir=ROOT/'stl';step_dir=ROOT/'step';stl_dir.mkdir(exist_ok=True);step_dir.mkdir(exist_ok=True)
rows=[];assembly=cq.Assembly(name='ScalyCam_printed_prototype')
colors=[cq.Color(0.78,0.82,0.71),cq.Color(0.94,0.94,0.90),cq.Color(0.27,0.34,0.20)]
for index,(name,part) in enumerate(parts.items()):
    shape=part.val();bb=shape.BoundingBox()
    if not shape.isValid() or len(shape.Solids())!=1: raise RuntimeError(f'{name}: invalid or disconnected solid')
    cq.exporters.export(part,str(step_dir/f'{name}.step'))
    printable=part
    if name=='top_plate_USE_A_DISH': printable=printable.rotate((0,0,0),(1,0,0),180)
    elif name.startswith('pillar_') or name=='camera_arm': printable=printable.rotate((0,0,0),(0,1,0),90)
    bounds=printable.val().BoundingBox();printable=printable.translate((-bounds.xmin,-bounds.ymin,-bounds.zmin))
    target=stl_dir/f'{name}.stl';cq.exporters.export(printable,str(target),tolerance=0.05,angularTolerance=0.15)
    mesh=trimesh.load_mesh(target,process=True)
    bbox=mesh.extents.tolist();fits=max(bbox)<=D['max_print_dimension']+0.001
    if not mesh.is_watertight or not mesh.is_winding_consistent or not fits: raise RuntimeError(f'{name}: mesh/print-envelope failure')
    rows.append({'part':name,'solid_count':len(shape.Solids()),'cad_valid':True,'volume_mm3':shape.Volume(),
       'stl_watertight':bool(mesh.is_watertight),'stl_winding_consistent':bool(mesh.is_winding_consistent),
       'print_bbox_mm':bbox,'fits_180mm':fits,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
    if name in placements: assembly.add(part,name=name,loc=cq.Location(cq.Vector(*placements[name])),color=colors[index%3])

# Reference parts for visual fit checks are NOT exported as printable items.
cell=box(cell_l,cell_w,cell_h,(0,0,cell_z))
for x in fixed_x+free_x: cell=cell.cut(zhole(x,0,cell_z-1,3.5,cell_h+2))
assembly.add(cell,name='REFERENCE_load_cell',color=cq.Color(0.65,0.65,0.67))
board=box(*S['board_envelope_mm'],at=(0,0,placements['camera_cradle'][2]+3))
assembly.add(board,name='REFERENCE_camera_envelope',color=cq.Color(0.12,0.15,0.15))
assembly.save(str(ROOT/'assembly.step'))
compound=assembly.toCompound()
cq.exporters.export(compound,str(ROOT/'assembly.svg'),opt={'width':1200,'height':1000,'projectionDir':(1,-1,0.8),'showHidden':False,'strokeWidth':0.6})

# Detect positive-volume collisions among all assembled printable parts. Contacts alone have zero volume.
collisions=[]
for i,a in enumerate(placements):
    for b in list(placements)[i+1:]:
        intersection=parts[a].translate(placements[a]).intersect(parts[b].translate(placements[b]))
        volume=sum(s.Volume() for s in intersection.solids().vals())
        if volume>0.01: collisions.append({'a':a,'b':b,'intersection_mm3':volume})
if collisions: raise RuntimeError(f'Assembled parts collide: {collisions}')
# Cell may touch only fixed pedestal and free tray boss, never overlap their volumes.
for name in ('scale_base','top_plate_USE_A_DISH'):
    v=sum(s.Volume() for s in parts[name].translate(placements[name]).intersect(cell).solids().vals())
    if v>0.01: raise RuntimeError(f'Cell overlaps {name}: {v}')
report={'status':'digital_geometry_checks_passed; physical_acceptance_pending','part_count':len(parts),
 'assembled_printed_part_count':len(placements),'parts':rows,'positive_volume_collisions':collisions,
 'tray_underside_above_base_rim_mm':tray_z-D['base_height'],
 'lowest_rib_above_base_rim_mm':tray_z-D['tray_rib_depth']-D['base_height'],
 'cell_free_end_above_floor_mm':cell_z-D['base_floor'],
 'stand_scale_plan_clearance_mm':base_front-D['base_size']/2,
 'nominal_camera_working_height_mm':D['camera_working_height'],
 'pillar_segment_length_mm':segment,'placements_mm':placements,
 'physical_pending':['actual hole pitch/thread ends','camera envelope and optical center','lens focus and frame coverage','print fit','tip/creep/load and corner-load tests','wiring clearance and strain relief'],
 'generated_by':'primary-reviewed CadQuery source; no printer contacted'}
(ROOT/'validation.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:report[k] for k in ['part_count','assembled_printed_part_count','status','lowest_rib_above_base_rim_mm','pillar_segment_length_mm']},indent=2))
