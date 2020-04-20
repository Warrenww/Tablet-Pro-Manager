var Layout, currentLayout, currentLayoutName, history;

const FunctionMap = ['','','ctrl','shift','alt','oneMoreSec','toggle','win','textColor','bgColor'];
const InstrName = (s) => {
  return {
    "VK_SPACE" : "space",
    "VK_CONTROL" : "ctrl",
    "VK_SHIFT" : "shift",
    "VK_MENU" : "alt",
    "VK_PRIOR" : "pageUp",
    "VK_NEXT" : "pageDown",
    "VK_END" : "end",
    "VK_HOME" : "home",
    "VK_SNAPSHOT" : "snapshot",
    "VK_CAPITAL" : "caps",
    "lbtn" : "L",
    "rbtn" : "R",
    "VK_F1" : "F1",
    "VK_F2" : "F2",
    "VK_F3" : "F3",
    "VK_F4" : "F4",
    "VK_F5" : "F5",
    "VK_F6" : "F6",
    "VK_F7" : "F7",
    "VK_F8" : "F8",
    "VK_F9" : "F9",
    "VK_F10" : "F10",
    "VK_F11" : "F11",
    "VK_F12" : "F12",
    "VK_OEM_1" : ";:",
  }[s] || s;
}
const LayoutName = {
  "floatpad" : "Float",
  "leftpad" : "Left",
  "rightpad" : "Right",
  "toppad" : "Top",
  "bottompad" : "bottom",
  "fullscreen" : "Fullscreen",
  "fullscreen_with_btns_horz" : "Fullscreen horz with button",
  "fullscreen_with_btns_vert" : "Fullscreen vert with button",
  "virtualctrls" : "Assist",
  "ArtistPad" : "Artist L",
  "ArtistPad_Medium" : "Artist M",
  "ArtistPad_Small" : "Artist S",
};
function parseLayout (row) {
  row = row.split("\n");
  var result = {},
      current_key;
  row.map(line => {
    if(line.trim() === '') return;

    if(/\[\w+\]/.test(line)){
      current_key = line.replace("[","").replace("]","").trim();
      result[current_key] = {tiles:[]};
    }
    else{
      let property = line.split("=")[0];
      if(/^tile/.test(property)){
        let [instruction, x, y, w, h, func, name, textColor, bgColor, clickPos] = line.slice(8).split(",");
        x = Number(x);
        y = Number(y);
        w = Number(w);
        h = Number(h);
        func = Number(func);
        name = (name || "").trim();
        textColor = (textColor || "").trim();
        bgColor = (bgColor || "").trim();
        clickPos = (clickPos || "").trim();
        result[current_key].tiles.push({instruction, x, y, w, h, func, name, textColor, bgColor, clickPos});
      }
      else {
        result[current_key][property] = line.split("=")[1];
      }
    }
  });

  return result;
}
const readData = () => {
  return new Promise(function(resolve, reject) {
    let temp = $("<input type='file'>");
    temp.on("change",(e) => {
      const file = temp[0].files[0];
      localStorage.setItem("file",file.name);
      $("#fileName").text(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        Layout = parseLayout(e.target.result);
        resolve();
      }
      reader.readAsText(file);
    });
    temp.click();
  });
}

async function loadFile(){
  if((Layout || localStorage.getItem("file")) && !confirm("Layout exists, replace it?")) return false;
  await readData();
  for (let key in Layout){
    localStorage.setItem(key,JSON.stringify(Layout[key]));
  }

}
function saveFile(){
  let text = "";
  for(let key in Layout){
    text += `[${key}]\r\n`;
    if(Layout[key].aspect) text += `aspect=${Layout[key].aspect.trim()}\r\n`;
    if(Layout[key].scale) text += `scale=${Layout[key].scale.trim()}\r\n`;
    Layout[key].tiles.map((tile, index) => {
      let {instruction, x, y, w, h, func, name, textColor, bgColor, clickPos} = tile,
      arr = Number(func).toString(2).split('').reverse(),
      temp = [instruction, x, y, w, h];
      text += `tile${index < 10 ? ('00'+index) : (index < 100 ? '0'+index : index) }=`;
      if(func){
        temp.push(func);
        if(tile.clickPos) temp = temp.concat([name, textColor, bgColor, clickPos]);
        else if(Number(arr[9])) temp = temp.concat([name, textColor, bgColor]);
        else if(Number(arr[8])) temp = temp.concat([name, textColor]);
        else if(Number(arr[0]) && Number(arr[1])) temp.push(name);
      }
      text += temp.join(",").trim();
      text += '\r\n';
    });

    text += "\r\n";
  }
  var file = new Blob([text],{type:"text/ini"}),
      reader = new FileReader();
      reader.onload = (e) => {
        console.log(e.target.result);
        var org_buf = new Uint8Array(e.target.result),
            new_buf = new Uint8Array(org_buf.length * 2 + 2);
        org_buf.map((x,i) => new_buf[i * 2 + 2] = x);
        new_buf[0] = 0xff;
        new_buf[1] = 0xfe;

        var link = URL.createObjectURL(new Blob([new_buf],{type:"text/ini"}));
        $(`<a href=${link} download=${localStorage.getItem("file")}></a>`)[0].click();
      }
      reader.readAsArrayBuffer(file);
}
function showHidePanel(name) {
  let target = $("#"+name+"Panel");
  if(target.is(".active")) target.removeClass("active");
  else target.addClass("active").siblings(".side").removeClass("active");
}
function renderLayout(layout){
  currentLayout = layout;
  $("#canvas #panel").remove();
  var [width_lim, height_lim] = [$(document).width()*0.8, ($(document).height() - 50)*0.8];
      panel = $("<div id='panel'></div>"),
      aspect = (layout.aspect || "1,1").split(","),
      sizeMult = Math.min(width_lim / aspect[0], height_lim / aspect[1]);

  var [width, height] = [aspect[0]*sizeMult, aspect[1]*sizeMult];
  panel.css({width, height});
  $("#layerPanel").empty();
  layout.tiles.map((tile, index) => {
    if(tile.instruction === 'pad') return;
    var {x, y, w, h, func, textColor, bgColor, clickPos, name} = tile;
    var elem = $("<div class='tile' id='"+index+"'>");
    var displayname = InstrName(tile.name || tile.instruction),
        is_icon = /^%uF/.test(displayname);

    elem.css({
      top : (`${Number(tile.y)}%`) ,
      left : (`${Number(tile.x)}%`) ,
      width : (`${Number(tile.w)}%`) ,
      height : (`${Number(tile.h)}%`),
      transform : "scale(.8)",
      "font-family" : (is_icon ? "Font Awesome\\ 5 Free" : "inherit"),
      color: "#" + textColor,
      backgroundColor: "#" + bgColor,
    });
    displayname = displayname.replace("%uF","&#xf")
    elem.html(displayname);

    panel.append(elem);
    $("#layerPanel").append(`
      <div target='${index}'>
        <span class='handle'></span>
        <div class='title' ${is_icon ? "style='font-family:\"Font Awesome 5 Free\"'" : ""}>
          ${displayname}
        </div>
      </div>
    `);
    $("#layerPanel div[target='"+index+"']").append(`
      <div class='toggle'>
        <div> <label for='x_${index}'>x : </label> <input type='number' value='${x}' id='x_${index}' /> </div>
        <div> <label for='y_${index}'>y : </label> <input type='number' value='${y}' id='y_${index}' /> </div>
        <div> <label for='w_${index}'>w : </label> <input type='number' value='${w}' id='w_${index}' /> </div>
        <div> <label for='h_${index}'>h : </label> <input type='number' value='${h}' id='h_${index}' /> </div>
        <div> <label for='textColor_${index}'>textColor : </label> <div class='color' id='textColor_${index}'>${textColor}</div> </div>
        <div> <label for='bgColor_${index}'>bgColor : </label> <div class='color' id='bgColor_${index}'>${bgColor}</div> </div>
      </div>
    `);
  });
  $("#canvas").append(panel);
}

$(document).on("keydown", function(e){
  // console.log(e.shiftKey);
  if(e.key === 'o' && e.ctrlKey){
    e.preventDefault();
    e.stopPropagation();
    loadFile()
    return false;
  }
  if(e.key === 'l' && e.ctrlKey){
    e.preventDefault();
    e.stopPropagation();
    showHidePanel((e.altKey ? 'layout' : 'layer'));
    return false;
  }
  if(e.key === 's' && e.ctrlKey){
    e.preventDefault();
    e.stopPropagation();
    saveFile();
  }

});
$(document).on("click touchend","#layerPanel>div",function(){
  var tile_id = $(this).attr("target");
      tile = currentLayout.tiles[tile_id];
  $(this).addClass("active").siblings().removeClass("active");
  $("#canvas #panel #"+tile_id).addClass("focus").siblings(".tile").removeClass("focus");
});
$(document).on("click touchend","#canvas #panel .tile",function(){
  var tile_id = $(this).attr('id');
      tile = currentLayout.tiles[tile_id];
  $(this).addClass("focus").siblings().removeClass("focus");
  $("#layerPanel div[target='"+tile_id+"']").addClass("active").siblings().removeClass("active");
  $("#layerPanel").scrollTop($("#layerPanel").scrollTop() - $(document).height() / 2 + $("#layerPanel div[target='"+tile_id+"']").offset().top);
});
$("#layoutPanel div").click(function(){
  var layout = Layout[$(this).attr("id")];
  $(this).addClass("active").siblings().removeClass("active");
  $("#fileName").text($("#fileName").text().split("-")[0] + "-" + LayoutName[$(this).attr("id")]);
  showHidePanel('layer');
  currentLayoutName = $(this).attr("id");
  renderLayout(layout);
});
var org_text;
$("#fileName").click(function(){
  org_text = $(this).text();
  org_name = org_text.split(".ini")[0];
  let input = $("<input type='text'>");
  input.attr('value',org_name);
  input.on("blur",() => {
    $(this).html(input.val()+".ini");
  });
  input.on("keydown",(e) => {
    if(e.key === 'Enter') $(this).html(input.val()+".ini");
    else if(e.key === 'Escape') $(this).html(org_text+".ini");
  });
  input.click(e => e.stopPropagation());
  $(this).html(input);
  input.focus();
});
const prop2css = {
  x: "left",
  y: "top",
  w: "width",
  h: "height"
};
$(document).on("change paste", "#layerPanel .toggle input", function(){
  let [property, index] = $(this).attr("id").split("_"),
      value = $(this).val();

  target = $("#canvas #panel .tile.focus");
  target.css({
    [prop2css[property]] : value + "%"
  })
  currentLayout.tiles[index][property] = value;
  Layout[currentLayoutName] = currentLayout;
  localStorage.setItem(currentLayoutName, JSON.stringify(currentLayout));
  // console.log(property, index, target, value)
});

$(document).ready(function() {
  $("#fileName").text(localStorage.getItem("file") || "Untitle.ini");
  if(localStorage.getItem("file")){
    Layout = {};
    $("#layoutPanel div").each(function(){
      let key = $(this).attr("id");
      Layout[key] = JSON.parse(localStorage.getItem(key));
    });
  }
  let active_target;
  $("#layerPanel").sortable({
    axis: 'y',
    handle: '.handle',
    update: (e, ui) => {
      let arr = $("#layerPanel").sortable("toArray",{attribute: "target"}),
          org_arr = currentLayout.tiles,
          new_arr = new Array(org_arr.length);
      active_target = ui.item.attr('target');
      org_arr.map((x,i) => {
        let idx = arr.indexOf(i.toString());
        if(i == active_target) active_target = idx;
        if(idx != -1) new_arr[idx] = x;
        else new_arr[i] = x;
      });
      currentLayout.tiles = new_arr;
      Layout[currentLayoutName] = currentLayout;
      localStorage.setItem(currentLayoutName, JSON.stringify(currentLayout));
      renderLayout(currentLayout);
      $("#layerPanel div[target='"+active_target+"']").click();
    }
  });
});
