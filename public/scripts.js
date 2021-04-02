import { clamp,lerp } from './helpers.js';
import { create_room } from './room.js';

const PARAMS = {
	num_rooms:18,
	num_columns:3,
	building_width:15,
	building_depth:1.7,
	height_range:{min:0.4,max:0.8},
	scrollSpeed: 6.0,
	lum_speed: 0.5,
	camera_roll_factor:{
		x:5,
		y:7
	},
	damping_roll:6
}

var clock = new THREE.Clock();
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 30 );

var renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default 
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;

document.body.appendChild( renderer.domElement );

// Render Pass
const renderScene = new THREE.RenderPass( scene, camera );

const bloomPass = new THREE.UnrealBloomPass( new THREE.Vector2( window.innerWidth, window.innerHeight ), 1.5, 0.4, 0.85 );
bloomPass.threshold = 0.5;
bloomPass.strength = 2;
bloomPass.radius = 1;

var composer = new THREE.EffectComposer( renderer );
composer.addPass( renderScene );
composer.addPass( bloomPass );

// Rajoute une caméra et une lumière dans la scene
const headlight = new THREE.PointLight( 0xffffff, .1, 100 );
camera.add( headlight );
scene.add( camera );
//headlight.position.set( 0, 0, 0 );


// Lumière pièce
const roomlight = new THREE.PointLight( 0xffffff, 0, 100 );
//roomlight.distance = 8;
roomlight.castShadow = true;
roomlight.shadow.bias = -0.0001;
scene.add( roomlight);

//plane.rotateX(Math.PI*0.5);
//plane.translateZ(-0.01);
//scene.add( plane );

// Génère les chambres
var i;
const rooms_height = new Float32Array(PARAMS.num_columns);
const rooms = [];
const width = PARAMS.building_width/PARAMS.num_columns;

for (i = 0; i < PARAMS.num_rooms; i++) {
  var height = lerp(PARAMS.height_range.min,PARAMS.height_range.max,Math.random())*width;
  rooms.push(
	create_room(
	  scene,
	  new THREE.Vector3(
		  (width/2)+(i%PARAMS.num_columns)*width,
		  -rooms_height[i%PARAMS.num_columns]-height,
		  0
		  ),
	  new THREE.Vector3(
		  width,
		  height,
		  PARAMS.building_depth
		  ),
	  0.1,
	  "white"
	  ));
  
  rooms_height[i%PARAMS.num_columns] += height;
  
} 

// Place la caméra
camera.position.x = PARAMS.building_width*0.5;
camera.position.y = -rooms_height[0]*0.5;

/// UPDATE ///

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
var prevTime = 0;
var velocityScroll = 0;
var velocityRoll ={x:0,y:0};
var hover_room ,selected_room;

var lockCamera = false;
var zoom = {factor:1};

/*const debugCursor = new THREE.Mesh( 
	new THREE.SphereGeometry( 100, 100 ),
	new THREE.MeshBasicMaterial( {color: 0xffff00} ) );*/

//scene.add(debugCursor);
function updateCharacterPosition(deltaTime){
	if(hover_room !== undefined){

	}
}
var update = function () {
	requestAnimationFrame( update );

	// Calcule delta time
	var time = performance.now();
  	var deltaTime = ( time - prevTime ) / 1000;
  	prevTime = time;

	// Applique une inertie à la vélocité du scroll
	velocityScroll = lerp(velocityScroll,0,deltaTime*PARAMS.scrollSpeed);

	// Inertie au roll
	velocityRoll.x = lerp(velocityRoll.x,mouse.x,deltaTime*PARAMS.damping_roll);
	velocityRoll.y = lerp(velocityRoll.y,mouse.y,deltaTime*PARAMS.damping_roll);

	camera.rotation.set(
		THREE.MathUtils.degToRad(velocityRoll.y*PARAMS.camera_roll_factor.x),
		THREE.MathUtils.degToRad(-velocityRoll.x*PARAMS.camera_roll_factor.y),
		0
		);
	if(lockCamera == false){
		
		camera.translateY(velocityScroll);
		// Clampe la caméra
		camera.position.set(camera.position.x,clamp(camera.position.y,-rooms_height[0],0),camera.position.z);
	}

	// Raycast
	raycaster.setFromCamera( mouse, camera );

	// calculate objects intersecting the picking ray
	const intersects = raycaster.intersectObjects( rooms );
  
	if(intersects.length>0 && hover_room != intersects[0].object && !lockCamera){
		//intersects[0].object.material.color.set( 0xff0000 );
    	var room = intersects[0].object;
		roomlight.intensity = 0;
		if(hover_room !== undefined && hover_room.userData.lamp !== undefined){
			hover_room.userData.lamp.switch(false);
		}
		const tween = new TWEEN.Tween(roomlight) // Create a new tween that modifies 'coords'.
			.to({intensity: .3}, 1000*PARAMS.lum_speed) // Move to (300, 200) in 1 second.
			.easing(TWEEN.Easing.Quadratic.Out) // Use an easing function to make the animation smooth.
			.start() // Start the tween immediately.
		if(room.userData.lamp !== undefined){
			roomlight.position.set(
				room.userData.lamp.position.x,
				room.userData.lamp.position.y,
				room.userData.lamp.position.z);

		}
		hover_room = room;
		if(hover_room !== undefined && hover_room.userData.lamp !== undefined){
			hover_room.userData.lamp.switch(true);
		}
	}else if(intersects.length==0){
		//roomlight.intensity = 0;
		//hover_room = null;
	}

	TWEEN.update(time);
	rooms.forEach((r)=>r.userData.onUpdate(deltaTime));

	updateCharacterPosition(deltaTime);

	composer.render();
};

update();

/// EVENTS ///

// remember these initial values
var tanFOV = Math.tan( ( ( Math.PI / 180 ) * camera.fov / 2 ) );
var windowHeight = window.innerHeight;
window.addEventListener( 'resize', onWindowResize, false );


function onWindowResize( event ) {

    camera.aspect = window.innerWidth / window.innerHeight;
    
    // adjust the FOV
    camera.fov = ( 360 / Math.PI ) * Math.atan( tanFOV * ( window.innerHeight / windowHeight ) );
    camera.position.z = PARAMS.building_width/camera.aspect*0.75;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.render( scene, camera );
    
}
onWindowResize();

function onWheel(ev) {
  velocityScroll -= ev.deltaY*0.1;
}
document.addEventListener("wheel", onWheel);

function onMouseMove( event ) {
	mouse.x = clamp(( event.clientX / window.innerWidth ) * 2 - 1,-1,1);
	mouse.y = clamp(- ( event.clientY / window.innerHeight ) * 2 + 1,-1,1);
}
window.addEventListener( 'mousemove', onMouseMove, false );

var oldPosition;
var cameraTween;
function onClick(event){
	selected_room = hover_room;
	if(selected_room != null && !lockCamera){
		oldPosition = camera.position;
		lockCamera = true;
		cameraTween = new TWEEN.Tween(camera.position)
				.to({x:selected_room.position.x,y: selected_room.userData.center.y,z:PARAMS.building_width/(camera.aspect*PARAMS.num_columns*2)}, 1000*PARAMS.lum_speed) // Move to (300, 200) in 1 second.
				.easing(TWEEN.Easing.Quadratic.Out)
				.start();
		if(selected_room.userData.door !== undefined){
			selected_room.userData.door.open();
		}
	}else if(lockCamera && oldPosition != null){
		lockCamera = false;
		cameraTween.stop();
		TWEEN.remove(cameraTween);
		cameraTween = new TWEEN.Tween(camera.position)
				.to({x:PARAMS.building_width*0.5,y:camera.position.y,z:PARAMS.building_width/camera.aspect*0.75}, 1000*PARAMS.lum_speed) // Move to (300, 200) in 1 second.
				.easing(TWEEN.Easing.Quadratic.Out) 
				.start();
		if(selected_room.userData.door !== undefined){
			selected_room.userData.door.close();
		}
		selected_room = null;
	}
}

document.addEventListener("click", onClick);