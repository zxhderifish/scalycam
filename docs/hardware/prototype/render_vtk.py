from pathlib import Path
import vtk,json,cadquery as cq
r=Path(__file__).resolve().parent
report=json.loads((r/'validation.json').read_text())
colors=['#c4ceb4','#f2efe5','#647344','#95a979','#95a979','#95a979','#78895e','#404b37']
ren=vtk.vtkRenderer();ren.SetBackground(0.965,0.957,0.937)
for i,(name,pos) in enumerate(report['placements_mm'].items()):
 shape=cq.importers.importStep(str(r/'step'/f'{name}.step')).val()
 vs,ts=shape.tessellate(.3,.3);pts=vtk.vtkPoints();cells=vtk.vtkCellArray()
 for v in vs:pts.InsertNextPoint(v.x,v.y,v.z)
 for t in ts:
  cells.InsertNextCell(3)
  for idx in t:cells.InsertCellPoint(idx)
 data=vtk.vtkPolyData();data.SetPoints(pts);data.SetPolys(cells)
 normals=vtk.vtkPolyDataNormals();normals.SetInputData(data);normals.ConsistencyOn();normals.AutoOrientNormalsOn();normals.SplittingOn();normals.Update()
 mapper=vtk.vtkPolyDataMapper();mapper.SetInputConnection(normals.GetOutputPort());actor=vtk.vtkActor();actor.SetMapper(mapper);actor.SetPosition(*pos)
 c=colors[i];actor.GetProperty().SetColor(*[int(c[k:k+2],16)/255 for k in (1,3,5)]);actor.GetProperty().SetInterpolationToFlat();ren.AddActor(actor)
cam=ren.GetActiveCamera();cam.SetPosition(650,-800,650);cam.SetFocalPoint(0,90,190);cam.SetViewUp(0,0,1);cam.ParallelProjectionOn();cam.SetParallelScale(245)
ren.ResetCameraClippingRange()
win=vtk.vtkRenderWindow();win.SetOffScreenRendering(1);win.AddRenderer(ren);win.SetSize(1100,1400);win.SetMultiSamples(8);win.Render()
capture=vtk.vtkWindowToImageFilter();capture.SetInput(win);capture.Update();writer=vtk.vtkPNGWriter();writer.SetFileName(str(r/'assembly-preview.png'));writer.SetInputConnection(capture.GetOutputPort());writer.Write();win.Finalize()
