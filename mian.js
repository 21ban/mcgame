// ========== 初始化 Three.js ==========
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.set(0,15,20);
const renderer = new THREE.WebGLRenderer({canvas: document.getElementById('gameCanvas')});
renderer.setSize(window.innerWidth, window.innerHeight);

// 材质
const materials = {
  dirt: new THREE.MeshBasicMaterial({color:0x8B4513}),
  grass: new THREE.MeshBasicMaterial({color:0x00FF00}),
  stone: new THREE.MeshBasicMaterial({color:0x808080}),
  wood: new THREE.MeshBasicMaterial({color:0xA0522D}),
  leaf: new THREE.MeshBasicMaterial({color:0x228B22}),
  water: new THREE.MeshBasicMaterial({color:0x1E90FF, transparent:true, opacity:0.7}),
  monster: new THREE.MeshBasicMaterial({color:0xFF0000})
};

const blocks = {};
const monsters = [];

// ========== 玩家状态 ==========
let mode = 'survival';
let player = { x:0, y:5, z:0, hp:20, hunger:20, inventory:{} };

const uiMode = document.getElementById('mode');
const uiHP = document.getElementById('hp');
const uiHunger = document.getElementById('hunger');
document.getElementById('toggleMode').onclick = ()=>{
  mode = mode==='survival'?'creative':'survival';
  uiMode.innerText = mode==='survival'?'生存':'创造';
};

// ========== 方块管理 ==========
function addBlock(x,y,z,type){
  const key = `${x},${y},${z}`;
  if(blocks[key]) return;
  const geometry = new THREE.BoxGeometry(1,1,1);
  const mesh = new THREE.Mesh(geometry, materials[type]||materials.stone);
  mesh.position.set(x,y,z);
  scene.add(mesh);
  blocks[key] = {mesh,type};
}
function removeBlock(x,y,z){
  const key = `${x},${y},${z}`;
  if(!blocks[key]) return;
  scene.remove(blocks[key].mesh);
  delete blocks[key];
}

// 初始化地形
for(let x=-20;x<=20;x++){
  for(let z=-20;z<=20;z++){
    addBlock(x,0,z,'grass');
  }
}

// 树木生成
function spawnTree(x,z){
  for(let y=1;y<=3;y++) addBlock(x,y, z, 'wood');
  for(let dx=-1;dx<=1;dx++){
    for(let dz=-1;dz<=1;dz++){
      addBlock(x+dx,4,z+dz,'leaf');
    }
  }
}
spawnTree(5,5);
spawnTree(-5,-5);

// ========== 背包 ==========
function addToInventory(type,count=1){
  if(player.inventory[type]) player.inventory[type]+=count;
  else player.inventory[type]=count;
}
function removeFromInventory(type,count=1){
  if(!player.inventory[type]) return false;
  player.inventory[type]-=count;
  if(player.inventory[type]<=0) delete player.inventory[type];
  return true;
}

// ========== 合成 ==========
const craftingTable = {
  'wood:4': 'plank:4',
  'plank:4': 'stick:4',
  'plank:4+stick:2': 'pickaxe:1'
};
function craftItem(){
  const inventoryStr = Object.entries(player.inventory).map(([t,c])=>`${t}:${c}`).join('+');
  for(const key in craftingTable){
    if(inventoryStr.includes(key)){
      const [resType,resCount] = craftingTable[key].split(':');
      key.split('+').forEach(item=>{
        const [type,count] = item.split(':');
        removeFromInventory(type,parseInt(count));
      });
      addToInventory(resType,parseInt(resCount));
      return `${resType} x${resCount}`;
    }
  }
  return null;
}

// ========== 生存逻辑 ==========
function tickSurvival(){
  if(mode==='survival'){
    player.hunger -=0.01;
    if(player.hunger<0){ player.hp-=0.05; player.hunger=0; }
    else if(player.hunger>15 && player.hp<20){ player.hp+=0.02; if(player.hp>20) player.hp=20; }
  }
  uiHP.innerText = Math.floor(player.hp);
  uiHunger.innerText = Math.floor(player.hunger);
}

// ========== 日夜循环 ==========
let time=0;
function updateDayNight(){
  time+=0.01;
  const color = new THREE.Color();
  color.setHSL(0.6,0.7,Math.max(0.2, Math.sin(time)*0.5+0.5));
  scene.background=color;
}

// ========== 怪物 ==========
function spawnMonster(x,y,z){
  const geo = new THREE.BoxGeometry(1,1,1);
  const mesh = new THREE.Mesh(geo, materials.monster);
  mesh.position.set(x,y,z);
  scene.add(mesh);
  monsters.push({mesh,x,y,z,hp:5});
}
function monsterAI(){
  for(let i=monsters.length-1;i>=0;i--){
    const m=monsters[i];
    const dx=player.x-m.mesh.position.x;
    const dz=player.z-m.mesh.position.z;
    const dist=Math.sqrt(dx*dx+dz*dz);
    if(dist>0.1){ m.mesh.position.x+=dx*0.01; m.mesh.position.z+=dz*0.01; }
    if(dist<1 && mode==='survival') player.hp-=0.1;
    if(dist<2 && attack){
      m.hp-=1;
      if(m.hp<=0){ addToInventory('meat',1); scene.remove(m.mesh); monsters.splice(i,1); }
    }
  }
}
let attack=false;
window.addEventListener('keydown',e=>{ if(e.key==='f') attack=true; });
window.addEventListener('keyup',e=>{ if(e.key==='f') attack=false; });
setInterval(()=>{ if(mode==='survival'){ spawnMonster(Math.floor(Math.random()*40-20),1,Math.floor(Math.random()*40-20)); } },5000);

// ========== 输入 ==========
window.addEventListener('keydown', e=>{
  switch(e.key){
    case 'w': player.z-=1; break;
    case 's': player.z+=1; break;
    case 'a': player.x-=1; break;
    case 'd': player.x+=1; break;
    case ' ': if(mode==='creative') player.y+=1; break;
    case 'Shift': if(mode==='creative') player.y-=1; break;
    case '1': addBlock(Math.floor(player.x), Math.floor(player.y-1), Math.floor(player.z),'dirt'); break;
    case '2': removeBlock(Math.floor(player.x), Math.floor(player.y-1), Math.floor(player.z)); break;
    case '3': if(removeFromInventory('apple',1)){player.hunger+=5; if(player.hunger>20) player.hunger=20;} break;
    case 'c': craftItem(); break;
  }
});

// ========== 渲染 ==========
function animate(){
  requestAnimationFrame(animate);
  tickSurvival();
  updateDayNight();
  monsterAI();
  camera.position.set(player.x, player.y+5, player.z+10);
  camera.lookAt(player.x,player.y,player.z);
  renderer.render(scene,camera);
}
animate();
