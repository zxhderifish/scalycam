from pathlib import Path
import cadquery as cq
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d.art3d import Poly3DCollection
import json,numpy as np
root=Path(__file__).resolve().parent
report=json.loads((root/'validation.json').read_text())
colors=['#c4ceb4','#f2efe5','#647344','#95a979','#95a979','#95a979','#78895e','#404b37']
fig=plt.figure(figsize=(12,10),facecolor='#f6f4ef');ax=fig.add_subplot(111,projection='3d')
ax.set_facecolor('#f6f4ef')
all_facets=[];all_colors=[]
for i,(name,pos) in enumerate(report['placements_mm'].items()):
    part=cq.importers.importStep(str(root/'step'/f'{name}.step')).translate(tuple(pos)).val()
    vertices,triangles=part.tessellate(.3,.3)
    points=np.array([[v.x,v.y,v.z] for v in vertices]);facets=points[np.array(triangles)]
    all_facets.extend(facets);all_colors.extend([colors[i]]*len(facets))
# A translucent board envelope and visible metal load-cell reference; not printable parts.
p=json.loads((root/'parameters.json').read_text());d=p['design']
for shape,color in [(cq.Workplane('XY').box(76,13.5,13.5,centered=(True,True,False)).translate((0,0,10)).val(),'#a9afb3'),
 (cq.Workplane('XY').box(21,17.8,15,centered=(True,True,False)).translate((0,0,report['placements_mm']['camera_cradle'][2]+3)).val(),'#182328')]:
    vs,ts=shape.tessellate(.3,.3);pts=np.array([[v.x,v.y,v.z] for v in vs]);all_facets.extend(pts[np.array(ts)]);all_colors.extend([color]*len(ts))
ax.add_collection3d(Poly3DCollection(all_facets,facecolors=all_colors,linewidth=0,shade=True))
ax.set_xlim(-100,100);ax.set_ylim(-90,270);ax.set_zlim(0,410);ax.set_box_aspect((200,360,410))
ax.view_init(elev=23,azim=-62);ax.set_axis_off()
fig.suptitle('ScalyCam · printable prototype',fontsize=22,color='#26321d',y=.96)
fig.text(.5,.055,'Actual CAD geometry · 8 assembly parts + 2 fit coupons\nIndependent stand / single load-cell path · physical fit, optics and strength pending',ha='center',fontsize=12,color='#535b4b')
fig.savefig(root/'assembly-preview.png',dpi=150,bbox_inches='tight',facecolor=fig.get_facecolor());plt.close(fig)
# Orthographic mechanical layout makes the independent footprints and load path inspectable.
fig,axes=plt.subplots(1,2,figsize=(12,7),facecolor='white')
from matplotlib.patches import Rectangle
ax=axes[0];ax.add_patch(Rectangle((-75,-75),150,150,facecolor='#c4ceb4',edgecolor='black'));ax.add_patch(Rectangle((-70,-70),140,140,facecolor='#f2efe5',edgecolor='black'))
ax.add_patch(Rectangle((-80,85),160,170,facecolor='#647344',alpha=.8,edgecolor='black'));ax.add_patch(Rectangle((-16,103),32,24,facecolor='#26321d'))
ax.plot([0,0],[115,0],linewidth=12,color='#95a979');ax.scatter([0],[0],color='#182328',s=120);ax.annotate('10 mm separation',xy=(70,80),xytext=(100,100),arrowprops={'arrowstyle':'->'})
ax.set_xlim(-95,180);ax.set_ylim(-90,270);ax.set_aspect('equal');ax.set_title('Top view · independent stand');ax.set_xlabel('mm');ax.set_ylabel('mm')
ax=axes[1];ax.add_patch(Rectangle((-75,0),150,4,facecolor='#c4ceb4',edgecolor='black'));ax.add_patch(Rectangle((-39,4),27,6,facecolor='#c4ceb4',edgecolor='black'))
ax.add_patch(Rectangle((-38,10),76,13.5,facecolor='#a9afb3',edgecolor='black'));ax.add_patch(Rectangle((12,23.5),27,6,facecolor='#f2efe5',edgecolor='black'));ax.add_patch(Rectangle((-70,29.5),140,5,facecolor='#f2efe5',edgecolor='black'))
ax.annotate('Fixed end: underside bolts',xy=(-25,9),xytext=(-80,46),arrowprops={'arrowstyle':'->'})
ax.annotate('Free end: tray bolts',xy=(25,25),xytext=(10,53),arrowprops={'arrowstyle':'->'})
ax.annotate('Only this beam connects\ntray load to base',xy=(0,17),xytext=(-30,-20),arrowprops={'arrowstyle':'->'})
ax.set_xlim(-90,90);ax.set_ylim(-30,60);ax.set_aspect('equal');ax.set_title('Side section · load path');ax.set_xlabel('mm')
fig.tight_layout();fig.savefig(root/'load-path.png',dpi=150);plt.close(fig)
