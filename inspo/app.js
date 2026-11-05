(function(){
"use strict";
var DATA = window.COLLECTION || [];
var STORE_KEY = "furniture-research-marks-v1";
var marks = new Set();
try{ (JSON.parse(localStorage.getItem(STORE_KEY) || "[]")).forEach(function(n){ marks.add(n); }); }catch(e){}
var state = { search:"", resort:"", markedOnly:false };
var visible = [];
var lightboxIndex = -1;

function $(id){ return document.getElementById(id); }
function saveMarks(){ try{ localStorage.setItem(STORE_KEY, JSON.stringify(Array.from(marks).sort())); }catch(e){} }
function encodePath(p){ return p.split("/").map(encodeURIComponent).join("/"); }
function fmtSize(b){ if(b>=1048576) return (b/1048576).toFixed(1)+" MB"; if(b>=1024) return Math.round(b/1024)+" KB"; return b+" B"; }
function resorts(){ var seen=[], s={}; DATA.forEach(function(it){ if(!s[it.resort]){ s[it.resort]=1; seen.push(it.resort); } }); return seen; }
function spacesOf(list){ var seen=[], s={}; list.forEach(function(it){ if(!s[it.space]){ s[it.space]=1; seen.push(it.space); } }); return seen; }

function applyFilters(){
  var q = state.search.trim().toLowerCase();
  visible = DATA.filter(function(it){
    if(state.resort && it.resort!==state.resort) return false;
    if(state.markedOnly && !marks.has(it.number)) return false;
    if(q){
      var hay = (it.number+" "+it.file+" "+it.resort+" "+it.space+" "+it.descriptor+" "+it.description).toLowerCase();
      if(hay.indexOf(q)===-1) return false;
    }
    return true;
  });
}

function markButtons(number){
  return document.querySelectorAll('[data-mark="'+number+'"]');
}
function syncMarkUI(number){
  var on = marks.has(number);
  markButtons(number).forEach(function(b){
    b.setAttribute("aria-pressed", on ? "true" : "false");
    if(b.classList.contains("mark-btn")) b.textContent = on ? "\u2665" : "\u2661";
    if(b.id==="lightboxMarkBtn") b.textContent = on ? "Marked \u2665" : "Mark";
  });
  $("markedCount").textContent = marks.size;
}
function toggleMark(number){
  if(marks.has(number)) marks.delete(number); else marks.add(number);
  saveMarks(); syncMarkUI(number);
  if(state.markedOnly) render();
  if(!$("exportPanel").hidden) fillExport();
}

function cardFor(it){
  var card = document.createElement("article"); card.className="card";
  var fig = document.createElement("figure");
  var img = document.createElement("img");
  img.src = encodePath(it.src); img.alt = it.resort+" - "+it.space+" - "+it.descriptor;
  img.loading="lazy"; img.decoding="async";
  img.addEventListener("click", function(){ openLightbox(it.number); });
  var mb = document.createElement("button");
  mb.type="button"; mb.className="mark-btn"; mb.setAttribute("data-mark", it.number);
  mb.setAttribute("aria-label", "Mark image "+it.number+" as a favourite");
  mb.addEventListener("click", function(){ toggleMark(it.number); });
  fig.appendChild(img); fig.appendChild(mb);
  var body = document.createElement("div"); body.className="card-body";
  var num = document.createElement("p"); num.className="card-num"; num.textContent = "Image "+it.number+(marks.has(it.number) ? "" : "");
  var title = document.createElement("p"); title.className="card-title"; title.textContent = it.descriptor;
  var place = document.createElement("p"); place.className="card-place"; place.textContent = it.resort+" - "+it.space;
  var desc = document.createElement("p"); desc.className="card-desc"; desc.textContent = it.description;
  var meta = document.createElement("p"); meta.className="card-meta";
  var s1=document.createElement("span"); s1.textContent = it.dimensions.replace("x"," x ")+" px";
  var s2=document.createElement("span"); s2.textContent = fmtSize(it.size);
  var s3=document.createElement("span"); s3.textContent = it.file;
  meta.appendChild(s1); meta.appendChild(s2); meta.appendChild(s3);
  var open = document.createElement("button"); open.type="button"; open.className="btn open-btn"; open.textContent="View full size";
  open.addEventListener("click", function(){ openLightbox(it.number); });
  body.appendChild(num); body.appendChild(title); body.appendChild(place); body.appendChild(desc); body.appendChild(meta); body.appendChild(open);
  card.appendChild(fig); card.appendChild(body);
  return card;
}

function render(){
  applyFilters();
  var main = $("gallery"); main.innerHTML="";
  var rs = resorts().filter(function(r){ return visible.some(function(it){ return it.resort===r; }); });
  rs.forEach(function(r){
    var sec = document.createElement("section"); sec.className="resort-section"; sec.id = "resort-"+r.replace(/[^A-Za-z0-9]+/g,"-");
    var head = document.createElement("div"); head.className="resort-head";
    var h2=document.createElement("h2"); h2.textContent=r;
    var cnt=document.createElement("p"); var list=visible.filter(function(it){return it.resort===r;});
    cnt.textContent = list.length+(list.length===1?" image":" images")+" - "+spacesOf(list).length+(spacesOf(list).length===1?" space":" spaces");
    head.appendChild(h2); head.appendChild(cnt); sec.appendChild(head);
    spacesOf(list).forEach(function(sp){
      var block=document.createElement("div"); block.className="space-block";
      var h3=document.createElement("h3"); h3.textContent=sp;
      var items=list.filter(function(it){return it.space===sp;});
      var span=document.createElement("span"); span.textContent=items.length+(items.length===1?" image":" images");
      h3.appendChild(span); block.appendChild(h3);
      var grid=document.createElement("div"); grid.className="grid";
      items.forEach(function(it){ grid.appendChild(cardFor(it)); });
      block.appendChild(grid); sec.appendChild(block);
    });
    main.appendChild(sec);
  });
  $("emptyState").hidden = visible.length>0;
  DATA.forEach(function(it){ syncMarkUI(it.number); });
  $("markedCount").textContent = marks.size;
  document.querySelectorAll("#resortNav button").forEach(function(b){
    b.classList.toggle("active", b.getAttribute("data-resort")===state.resort);
  });
}

function fillExport(){
  var picked = DATA.filter(function(it){ return marks.has(it.number); });
  $("exportSummary").textContent = picked.length===0 ?
    "No images marked yet. Tap the heart on any image to add it here." :
    picked.length+(picked.length===1?" image":" images")+" marked. Copy the list below, or download it, and paste it back in chat to get a deeper designer review of each pick.";
  $("exportText").value = picked.map(function(it){ return it.file; }).join("\n");
}
function download(name, text, type){
  var blob = new Blob([text], {type:type});
  var url = URL.createObjectURL(blob);
  var a=document.createElement("a"); a.href=url; a.download=name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function(){ URL.revokeObjectURL(url); }, 2000);
}
function csvCell(v){ return '"'+String(v).replace(/"/g,'""')+'"'; }

function openLightbox(number){
  lightboxIndex = visible.findIndex(function(it){ return it.number===number; });
  if(lightboxIndex===-1) return;
  showLightbox(); $("lightbox").hidden=false;
  $("lightboxCloseBtn").focus();
}
function showLightbox(){
  var it = visible[lightboxIndex]; if(!it) return;
  var img=$("lightboxImg"); img.src=encodePath(it.src); img.alt=it.resort+" - "+it.space+" - "+it.descriptor;
  $("lightboxTitle").textContent = it.number+" - "+it.descriptor;
  $("lightboxDesc").textContent = it.description;
  $("lightboxMeta").textContent = it.resort+" - "+it.space+" - "+it.dimensions.replace("x"," x ")+" px - "+fmtSize(it.size)+" - File: "+it.file+" - Image "+(lightboxIndex+1)+" of "+visible.length+" in the current view";
  var mb=$("lightboxMarkBtn"); mb.setAttribute("data-mark", it.number);
  syncMarkUI(it.number);
}
function stepLightbox(d){
  if(visible.length===0) return;
  lightboxIndex = (lightboxIndex + d + visible.length) % visible.length;
  showLightbox();
}
function closeLightbox(){ $("lightbox").hidden=true; }

function init(){
  var rs = resorts();
  var sel = $("resortFilter");
  rs.forEach(function(r){ var o=document.createElement("option"); o.value=r; o.textContent=r; sel.appendChild(o); });
  var nav=$("resortNav");
  var all=document.createElement("button"); all.type="button"; all.textContent="All resorts"; all.setAttribute("data-resort","");
  all.addEventListener("click", function(){ state.resort=""; sel.value=""; render(); });
  nav.appendChild(all);
  rs.forEach(function(r){
    var b=document.createElement("button"); b.type="button"; b.textContent=r; b.setAttribute("data-resort", r);
    b.addEventListener("click", function(){ state.resort=r; sel.value=r; render(); document.getElementById("resort-"+r.replace(/[^A-Za-z0-9]+/g,"-")).scrollIntoView(); });
    nav.appendChild(b);
  });
  var pairSeen={}, totalSpaces=0;
  DATA.forEach(function(it){ var k=it.resort+"|"+it.space; if(!pairSeen[k]){ pairSeen[k]=1; totalSpaces++; } });
  $("statsLine").textContent = DATA.length+" images - "+rs.length+" resorts - "+totalSpaces+" spaces - "+marks.size+" marked so far in this browser";
  $("searchInput").addEventListener("input", function(e){ state.search=e.target.value; render(); });
  sel.addEventListener("change", function(e){ state.resort=e.target.value; render(); });
  $("markedOnlyBtn").addEventListener("click", function(){
    state.markedOnly=!state.markedOnly;
    this.setAttribute("aria-pressed", state.markedOnly?"true":"false"); render();
  });
  $("exportBtn").addEventListener("click", function(){ fillExport(); $("exportPanel").hidden=false; $("exportPanel").scrollIntoView({behavior:"smooth"}); });
  $("closeExportBtn").addEventListener("click", function(){ $("exportPanel").hidden=true; });
  $("copyExportBtn").addEventListener("click", function(){
    fillExport();
    var ta=$("exportText"); var done=function(){ $("copyNote").textContent = marks.size? "Copied. Paste the list back in chat to get the review of your picks." : "Nothing to copy yet, no images are marked."; };
    if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(ta.value).then(done, function(){ ta.select(); document.execCommand("copy"); done(); }); }
    else{ ta.select(); document.execCommand("copy"); done(); }
  });
  $("downloadTxtBtn").addEventListener("click", function(){
    fillExport(); download("Furniture Research - Marked Picks.txt", $("exportText").value || "No images marked.", "text/plain");
    $("copyNote").textContent = "Text file downloaded.";
  });
  $("downloadCsvBtn").addEventListener("click", function(){
    var picked = DATA.filter(function(it){ return marks.has(it.number); });
    var lines = ["Number,File name,Resort,Space"].concat(picked.map(function(it){ return [csvCell(it.number),csvCell(it.file),csvCell(it.resort),csvCell(it.space)].join(","); }));
    download("Furniture Research - Marked Picks.csv", lines.join("\n"), "text/csv");
    $("copyNote").textContent = "CSV file downloaded.";
  });
  $("clearMarksBtn").addEventListener("click", function(){
    if(marks.size===0){ $("copyNote").textContent=""; return; }
    if(confirm("Clear all "+marks.size+" marks? This cannot be undone.")){
      marks.clear(); saveMarks(); render(); if(!$("exportPanel").hidden) fillExport();
    }
  });
  $("lightboxCloseBtn").addEventListener("click", closeLightbox);
  $("lightboxBackdrop").addEventListener("click", closeLightbox);
  $("lightboxPrevBtn").addEventListener("click", function(){ stepLightbox(-1); });
  $("lightboxNextBtn").addEventListener("click", function(){ stepLightbox(1); });
  $("lightboxMarkBtn").addEventListener("click", function(){ var it=visible[lightboxIndex]; if(it) toggleMark(it.number); });
  document.addEventListener("keydown", function(e){
    if($("lightbox").hidden) return;
    if(e.key==="Escape") closeLightbox();
    else if(e.key==="ArrowLeft") stepLightbox(-1);
    else if(e.key==="ArrowRight") stepLightbox(1);
  });
  render();
}
document.addEventListener("DOMContentLoaded", init);
})();
