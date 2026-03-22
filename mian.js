// =====================
// 初始化 Three.js
// =====================
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
  monster: new THREE.MeshBasicMaterial({color:0xFF0000})
};

const blocks = {};
const monsters = [];

// =====================
// 游戏状态
// =====================
let mode = 'survival'; // 'survival' 或 'creative'
let player = {
  x:0, y:5, z:0,
  hp: 20,
  hunger: 20,
  inventory: {}
};

// UI元素
const uiMode = document.getElementById('mode');
const uiHP = document.getElementById('hp');
const uiHunger = document.getElementById('hunger');
const uiInventory = document.getElementById('inventory');
document.getElementById('toggleMode').onclick = () => {
  mode = mode==='survival'?'creative':'survival';
  uiMode.innerText = mode==='survival'?'生存':'创造';
};

// =====================
// 方块管理
// =====================
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

// 初始化地面
for(let x=-10;x<=10;x++){
  for(let z=-10;z<=10;z++){
    addBlock(x,0,z,'grass');
  }
}

// =====================
// 背包系统
// =====================
function addToInventory(type,count=1){
  if(player.inventory[type]) player.inventory[type]+=count;
  else player.inventory[type]=count;
  updateInventoryUI();
}

function removeFromInventory(type,count=1){
  if(!player.inventory[type]) return false;
  player.inventory[type]-=count;
  if(player.inventory[type]<=0) delete player.inventory[type];
  updateInventoryUI();
  return true;
}

function updateInventoryUI(){
  const items = Object.entries(player.inventory).map(([t,c])=>`${t}x${c}`);
  uiInventory.innerText = items.length?items.join(', '):'空';
}

// =====================
// 合成系统
// =====================
const craftingTable = {
  'wood:4': 'plank:4',
  'plank:4': 'stick:4',
  'plank:4+stick:2': 'pickaxe:1'
};

function craftItem(){
  const inventoryStr = Object.entries(player.inventory)
      .map(([type,count])=>`${type}:${count}`)
      .join('+');
  for(const key in craftingTable){
    if(inventoryStr.includes(key)){
      const result = craftingTable[key];
      const [resType,resCount] = result.split(':');
      key.split('+').forEach(item=>{
        const [type,count] = item.split(':');
        removeFromInventory(type, parseInt(count));
      });
      addToInventory(resType, parseInt(resCount));
      console.log(`合成成功: ${resType} x${resCount}`);
      return;
    }
  }
  console.log('没有可合成物品');
}

// =====================
// 生存逻辑
// =====================
function tickSurvival(){
  if(mode==='survival'){
    player.hunger -= 0.01;
    if(player.hunger<0){
      player.hp -= 0.05;
      player.hunger = 0;
    } else if(player.hunger > 15 && player.hp < 20){
      player.hp += 0.02;
      if(player.hp>20) player.hp=20;
    }
  }
  uiHP.innerText = Math.floor(player.hp);
  uiHunger.innerText = Math.floor(player.hunger);
}

// =====================
// 日夜循环
// =====================
let time = 0;
function updateDayNight(){
  time += 0.01;
  const color = new THREE.Color();
  color.setHSL(0.6,0.7,Math.max(0.2, Math.sin(time)*0.5+0.5));
  scene.background = color;
}

// =====================
// 怪物生成与AI
// =====================
function spawnMonster(x,y,z){
  const geometry = new THREE.BoxGeometry(1,1,1);
  const mesh = new THREE.Mesh(geometry, materials.monster);
  mesh.position.set(x,y,z);
  scene.add(mesh);
  monsters.push({mesh,x,y,z,hp:5});
}

function monsterAI(){
  for(let i=monsters.length-1;i>=0;i--){
    const m = monsters[i];
    const dx = player.x - m.mesh.position.x;
    const dz = player.z - m.mesh.position.z;
    const dist = Math.sqrt(dx*dx + dz*dz);
    if(dist>0.1){
      m.mesh.position.x += dx*0.01;
      m.mesh.position.z += dz*0.01;
    }
    if(dist<1 && mode==='survival'){
      player.hp -= 0.1;
    }
    if(dist<2 && attack){
      m.hp -= 1;
      if(m.hp<=0){
        addToInventory('meat',1);
        scene.remove(m.mesh);
        monsters.splice(i,1);
        console.log('怪物死亡，掉落肉 x1');
      }
    }
  }
}
let attack = false;
window.addEventListener('keydown',(e)=>{
  if(e.key==='f') attack = true;
});
window.addEventListener('keyup',(e)=>{
  if(e.key==='f') attack = false;
});

// 定期生成怪物
setInterval(()=>{
  if(mode==='survival'){
    const x = Math.floor(Math.random()*20-10);
    const z = Math.floor(Math.random()*20-10);
    spawnMonster(x,1,z);
  }
},5000);

// =====================
// 输入与交互
// =====================
window.addEventListener('keydown', (e)=>{
  switch(e.key){
    case 'w': player.z -=1; break;
    case 's': player.z +=1; break;
    case 'a': player.x -=1; break;
    case 'd': player.x +=1; break;
    case ' ': if(mode==='creative') player.y +=1; break;
    case 'Shift': if(mode==='creative') player.y -=1; break;
    case '1': addBlock(Math.floor(player.x), Math.floor(player.y-1), Math.floor(player.z), 'dirt'); break;
    case '2': removeBlock(Math.floor(player.x), Math.floor(player.y-1), Math.floor(player.z)); break;
    case '3': // 吃食物
      if(removeFromInventory('apple',1)){
        player.hunger += 5;
        if(player.hunger>20) player.hunger=20;
        console.log('食用苹果，饥饿恢复5');
      }
      break;
    case 'c': craftItem(); break;
  }
});

// =====================
// 渲染循环
// =====================
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
