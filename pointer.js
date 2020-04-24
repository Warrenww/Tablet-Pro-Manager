var pointerCache = [],
    original_gap = 0;
$(document).on("pointerdown pointerenter pointerover",function(e){
  // console.log(e.pointerId, e.pressure, e.pointerType)
  // console.log(e.width, e.height, e.clientX, e.clientY)
  if(e.pointerType === "touch"){
    if(!pointerCache.find(x => x.id === e.pointerId)){
      pointerCache.push({
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
      });
    }
  }
});
$(document).on("pointerup pointerleave onpointercancel onpointerout",function(e){

  pointerCache.length = 0;
});
$(document).on("pointermove",function(e){
  e.preventDefault();
  e.stopPropagation();
  if(pointerCache.length === 2){
  }
  if(e.pointerType === "touch"){
    pointerCache.map((x,i) => {
      if(x.id === e.pointerId){
        x.x = e.clientX;
        x.y = e.clientY;
      }
    });
  }
  return false;
});
