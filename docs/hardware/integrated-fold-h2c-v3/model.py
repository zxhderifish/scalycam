"""Envelope studies only; NOT fabrication CAD. No printer actions. Units: mm."""
from pathlib import Path
import cadquery as cq, vtk, json
R=Path(__file__).parent
COL={'chassis':'#b9c8ab','tray':'#efebe1','cell':'#acafb2','pcb':'#397b5f','mast':'#738b6c','joint':'#3f4e43','head':'#a5b798','lens':'#202726'}
def box(w,d,h,x,y,z):return cq.Workplane('XY').box(w,d,h).translate((x,y,z)).val()
def render(parts,path):
 ren=vtk.vtkRenderer();ren.SetBackground(.969,.961,.937)
 for n,shape,c,opacity in parts:
  vs,ts=shape.tessellate(.5,.3);pts=vtk.vtkPoints();cells=vtk.vtkCellArray()
  for v in vs:pts.InsertNextPoint(v.x,v.y,v.z)
  for t in ts:
   cells.InsertNextCell(3)
   for i in t:cells.InsertCellPoint(i)
  poly=vtk.vtkPolyData();poly.SetPoints(pts);poly.SetPolys(cells)
  normals=vtk.vtkPolyDataNormals();normals.SetInputData(poly);normals.ConsistencyOn();normals.AutoOrientNormalsOn();normals.Update()
  mapper=vtk.vtkPolyDataMapper();mapper.SetInputConnection(normals.GetOutputPort());a=vtk.vtkActor();a.SetMapper(mapper);a.GetProperty().SetColor(*[int(c[k:k+2],16)/255 for k in (1,3,5)]);a.GetProperty().SetOpacity(opacity);ren.AddActor(a)
 cam=ren.GetActiveCamera();cam.SetPosition(600,-700,520);cam.SetFocalPoint(85,85,170);cam.SetViewUp(0,0,1);cam.ParallelProjectionOn();ren.ResetCamera();cam.Zoom(.65);ren.ResetCameraClippingRange()
 win=vtk.vtkRenderWindow();win.SetOffScreenRendering(1);win.AddRenderer(ren);win.SetSize(1200,1000);ren.ResetCamera();cam.Zoom(.9);ren.ResetCameraClippingRange();win.Render();cap=vtk.vtkWindowToImageFilter();cap.SetInput(win);cap.Update();writer=vtk.vtkPNGWriter();writer.SetFileName(str(path));writer.SetInputConnection(cap.GetOutputPort());writer.Write();win.Finalize()
import math
W,D=210.,220.
P=(65.,180.,55.)
L=155.
E=(105.,180.,210.)
T=(105.,180.,365.)
BASE=35.; TRAY_TOP=38.
fixed=[];lower=[];upper=[]
def add(dst,n,s,c,op=1):dst.append((n,s,COL.get(c,c),op))
def rot_x(s,p,a):return s.rotate(p,(p[0]+1,p[1],p[2]),a)
def rounded(w,d,h,x,y,z,r):return cq.Workplane('XY').box(w,d,h).edges('|Z').fillet(r).translate((x,y,z)).val()
outer=rounded(W,D,35,105,110,17.5,6)
inner=rounded(W-6,D-6,33,105,110,20.5,3)
add(fixed,'fixed_base',outer.cut(inner),'chassis')
add(fixed,'floating_tray',rounded(140,140,5,105,82,35.5,5),'tray',.65)
add(fixed,'load_cell_nominal',box(76,13.5,13.5,105,82,16.75),'cell')
add(fixed,'fixed_spacer',box(18,13.5,6,76,82,7),'joint')
add(fixed,'free_spacer',box(18,13.5,9.5,134,82,28.25),'joint')
add(fixed,'HX711_reserved',box(40,25,12,40,135,10),'pcb')
add(fixed,'base_hinge_mount_ENVELOPE',box(40,24,47,65,180,27.5),'joint')
add(fixed,'base_release_pin_ENVELOPE',box(8,14,8,39,180,30),'cell')
add(fixed,'USB_inlet_RESERVED',box(14,8,8,190,212,18),'pcb')
# Complete metal pin and rotor geometry are not yet engineered; these mark only the hinge envelope.
add(fixed,'base_axle_RESERVED',cq.Solid.makeCylinder(3,48,cq.Vector(41,180,55),cq.Vector(1,0,0)),'cell')
# U-channel mast: open face is intended to receive a removable cover in fabrication design.
lo=box(22,22,L,65,180,55+L/2).cut(box(12,18,L+2,65,184,55+L/2))
for z in (55,210):lo=lo.fuse(cq.Solid.makeCylinder(14,22,cq.Vector(54,180,z),cq.Vector(1,0,0)))
for z in (55,210):lo=lo.cut(cq.Solid.makeCylinder(3.3,26,cq.Vector(52,180,z),cq.Vector(1,0,0)))
add(lower,'lower_arm_U_channel',lo,'mast')
add(lower,'elbow_axis_RESERVED',cq.Solid.makeCylinder(3,64,cq.Vector(54,180,210),cq.Vector(1,0,0)),'cell')
# 40 mm lateral separation makes the two shafts lie beside one another after folding.
add(lower,'elbow_bridge_ENVELOPE',box(18,16,10,85,180,226),'joint')
up=box(22,22,130,105,180,210+65).cut(box(12,18,132,105,184,210+65))
up=up.fuse(cq.Solid.makeCylinder(14,22,cq.Vector(94,180,210),cq.Vector(1,0,0)))
up=up.cut(cq.Solid.makeCylinder(3.3,26,cq.Vector(92,180,210),cq.Vector(1,0,0)))
add(upper,'upper_arm_U_channel',up,'mast')
add(upper,'fixed_head_neck',box(18,18,10,105,180,343),'mast')
# Head parts made in their own frame, fixed -35 deg to the upper rod.
# Deployed upper angle +35 makes camera lens point straight down.
head_parts=[]
case=rounded(46,40,29,0,0,-1.5,3).cut(box(40,34,28,0,0,1))
case=case.cut(cq.Solid.makeCylinder(7,10,cq.Vector(0,0,-20),cq.Vector(0,0,1)))
add(head_parts,'camera_case_ENVELOPE',case,'head',.45)
add(head_parts,'camera_service_lid',rounded(46,40,3,0,0,14.5,3),'head',.65)
add(head_parts,'XIAO_Sense_nominal',box(21,17.8,15,0,0,0),'pcb')
add(head_parts,'antenna_RESERVED',box(6,30,3,16,0,8),'cell')
add(head_parts,'lens_RESERVED',cq.Solid.makeCylinder(6,6,cq.Vector(0,0,-22),cq.Vector(0,0,1)),'lens')
for n,s,c,o in head_parts:upper.append((n,rot_x(s,(0,0,0),-35).translate(T),c,o))
# Raise the moving mechanism 10 mm after the initial sweep found a head/tray clash.
lower=[(n,s.translate((0,0,10)),c,o) for n,s,c,o in lower]
upper=[(n,s.translate((0,0,10)),c,o) for n,s,c,o in upper]
fixed=[(n,s.translate((0,0,10)) if n in {'base_axle_RESERVED','base_release_pin_ENVELOPE'} else s,c,o) for n,s,c,o in fixed]
P=(P[0],P[1],P[2]+10);E=(E[0],E[1],E[2]+10)
# Attached protective cover: load transfers via outer base rim, never tray or folded arms.
lid_outer=rounded(W,D,65,105,110,67.5,6)
lid_inner=rounded(W-6,D-6,65,105,110,64.5,3)
lid=lid_outer.cut(lid_inner)
LID_AXIS=(105.,220.,35.)
def pose(alpha,beta,lid_angle):
 return fixed+[(n,rot_x(s,P,alpha),c,o) for n,s,c,o in lower]+[(n,rot_x(rot_x(s,E,beta),P,alpha),c,o) for n,s,c,o in upper]+[('attached_protective_cover',rot_x(lid,LID_AXIS,lid_angle),COL['chassis'],.25)]
states={'deployed':(0,35,-110),'head_folded':(0,180,-110),'arms_stowed':(90,180,-110),'closed':(90,180,0)}
reports={}
for name,args in states.items():
 parts=pose(*args);ass=cq.Assembly(name='INTEGRATED_FOLD_'+name+'_CONCEPT')
 for n,s,c,o in parts:
  assert s.isValid() and s.Volume()>0,n
  ass.add(s,name=n,color=cq.Color(*[int(c[k:k+2],16)/255 for k in (1,3,5)],o))
 ass.save(str(R/(name+'.step')));render(parts,R/(name+'-cad.png'))
 bb=cq.Compound.makeCompound([s for _,s,_,_ in parts]).BoundingBox()
 reports[name]={'envelope_mm':[round(bb.xlen,2),round(bb.ylen,2),round(bb.zlen,2)],'parts':len(parts)}
# Save detailed sampled checks. Designed joint interfaces/envelopes are excluded.
structural_names={'fixed_base','floating_tray','load_cell_nominal','HX711_reserved','USB_inlet_RESERVED'}
body_names={'lower_arm_U_channel','upper_arm_U_channel','fixed_head_neck','camera_case_ENVELOPE','camera_service_lid','XIAO_Sense_nominal','antenna_RESERVED','lens_RESERVED'}
fixed_obstacles=[p for p in fixed if p[0] in structural_names]
paths=[('fold_upper',[(0,b,-110) for b in range(35,181,5)]),('fold_lower',[(a,180,-110) for a in range(0,91,5)]),('close_cover',[(90,180,g) for g in range(-110,1,5)])]
results=[]
for stage,frames in paths:
 for args in frames:
  parts=pose(*args);collisions=[]
  movers=[p for p in parts if p[0] in body_names]
  lidshape=parts[-1][1]
  for n,s,c,o in movers:
   for on,os,_,_ in fixed_obstacles:
    vol=s.intersect(os).Volume()
    if vol>1e-5:collisions.append([n,on,round(vol,5)])
   vol=s.intersect(lidshape).Volume()
   if vol>1e-5:collisions.append([n,'protective_cover',round(vol,5)])
  # Collision of upper/head with lower shaft, excluding intended elbow/pin interfaces.
  lo_shape=next(s for n,s,c,o in parts if n=='lower_arm_U_channel')
  for n,s,c,o in movers:
   if n=='lower_arm_U_channel':continue
   vol=s.intersect(lo_shape).Volume()
   if vol>1e-5:collisions.append([n,'lower_arm',round(vol,5)])
  for on,os,_,_ in fixed_obstacles:
   vol=lidshape.intersect(os).Volume()
   if vol>1e-5:collisions.append(['protective_cover',on,round(vol,5)])
  results.append({'stage':stage,'angles':args,'collisions':collisions})
report={'status':'component-aware connected-fold concept; not fabrication release','printer':'Bambu Lab H2C','all_parts_remain_attached':True,'arm_hinges':2,'attached_cover_hinges':1,'internal_cable_disconnects':0,'user_actions':'fold upper arm, fold lower arm, close attached cover','parameters':{'base_xy_mm':[W,D],'lower_length_mm':L,'upper_length_mm':L,'lateral_arm_spacing_mm':40,'base_pivot':P,'elbow_pivot':E,'deployed_upper_angle_deg':35},'states':reports,'sampled_frames':results,'sampled_collision_count':sum(len(x['collisions']) for x in results),'proposed_lens_to_tray_mm':65+155+155*math.cos(math.radians(35))-22-38,'camera_offset_from_tray_center_mm':180-155*math.sin(math.radians(35))-82,'pending':['complete hinge/bridge retention and automatic locking pins','removable cable covers and service loops','continuous motion sweep','real component tolerances and USB/power routing','strength/tip/fatigue/transport load','camera focus/FOV','Bambu Studio slicing'],'printable':False}
# Verify every moving envelope stays inside the closed protective lid's inner volume.
closed_parts=pose(90,180,0)
contained=[]
for n,s,c,o in closed_parts:
 if n not in {q[0] for q in lower+upper}:continue
 bb=s.BoundingBox()
 ok=bb.xmin>=3-1e-4 and bb.xmax<=207+1e-4 and bb.ymin>=3-1e-4 and bb.ymax<=217+1e-4 and bb.zmin>=35-1e-4 and bb.zmax<=97+1e-4
 contained.append({'part':n,'within_closed_inner_box':ok})
assert all(x['within_closed_inner_box'] for x in contained),contained
assert report['sampled_collision_count']==0,report['sampled_collision_count']
report['closed_moving_envelope_containment']=contained
report['minimum_cover_roof_clearance_mm']=round(97-max(s.BoundingBox().zmax for n,s,_,_ in closed_parts if n in {q[0] for q in lower+upper}),2)
(R/'validation.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'states':reports,'frames':len(results),'collisions':report['sampled_collision_count']},indent=2))
for row in results:
 if row['collisions']:print(row)
