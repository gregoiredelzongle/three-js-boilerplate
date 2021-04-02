

export function create_room(scene,p,s,ecart,color){
  
    const geom = new THREE.BufferGeometry();
    const verts = [];
    const faces = [];
    
    // CARRE EXTERNE
    verts.push(-s.x*0.5,0,0);   // 0
    verts.push(s.x*0.5,0,0);    // 1
    verts.push(s.x*0.5,s.y,0);  // 2
    verts.push(-s.x*0.5,s.y,0); // 3
  
    // CARRE INTERNE
    verts.push(-s.x*0.5+ecart,ecart,0);     // 4
    verts.push(s.x*0.5-ecart,ecart,0);      // 5
    verts.push(s.x*0.5-ecart,s.y-ecart,0);  // 6
    verts.push(-s.x*0.5+ecart,s.y-ecart,0); // 7
    
    // RENFONCEMENT
    verts.push(-s.x*0.5+ecart,ecart,-s.z);      // 8
    verts.push(s.x*0.5-ecart,ecart,-s.z);       // 9
    verts.push(s.x*0.5-ecart,s.y-ecart,-s.z);   // 10
    verts.push(-s.x*0.5+ecart,s.y-ecart,-s.z);  // 11
    
    // BORDS EXTERNE
    verts.push(-s.x*0.5,0,-s.z);    // 12
    verts.push(s.x*0.5,0,-s.z);     // 13
    verts.push(s.x*0.5,s.y,-s.z);   // 14
    verts.push(-s.x*0.5,s.y,-s.z);  // 15
    
    faces.push(8,10,11);
    faces.push(9,10,8);
    
    faces.push(8,4,9);
    faces.push(4,5,9);
    faces.push(5,6,10);
    faces.push(5,10,9);
    faces.push(10,6,7);
    faces.push(10,7,11);
    faces.push(8,11,7);
    faces.push(8,7,4);
    
    // BORDURE
    faces.push(0,1,5);
    faces.push(0,5,4);
    faces.push(1,2,6);
    faces.push(1,6,5);
    faces.push(2,3,7);
    faces.push(2,7,6);
    faces.push(3,0,4);
    faces.push(3,4,7);

    // EXT
    faces.push(0,1,13);
    faces.push(0,13,12);
    faces.push(1,2,14);
    faces.push(1,2,14);
    faces.push(1,14,13);
    faces.push(2,3,15);
    faces.push(2,15,14);
    faces.push(3,0,12);
    faces.push(3,12,15);
    
    geom.setIndex( faces );
    geom.setAttribute( 'position', new THREE.Float32BufferAttribute( verts, 3 ) );
      
    geom.computeVertexNormals();
    
    var material = new THREE.MeshStandardMaterial( { color: "white",flatShading:true } );
    var room = new THREE.Mesh( geom,material );
    
    room.userData.center = new THREE.Vector3(p.x,p.y + s.y*0.5,-s.z*0.5);
    room.castShadow = true;
    room.receiveShadow = true;


    const loader = new THREE.GLTFLoader();

    // Load door
    
    loader.load(
      // resource URL
      './assets/door.glb',
      // called when the resource is loaded
      function ( gltf ) {

        const door = gltf.scene;
        room.add( door );
        door.position.set(s.x*0.25,0,-s.z);
        door.scale.set(0.5,0.5,0.5);

        gltf.scene.traverse( function ( child ) {

          if ( child.isMesh ) {

              child.castShadow = true;
              child.receiveShadow = true;
              child.material.side = THREE.FrontSide;
              child.material.shadowSide = THREE.FrontSide;

          }
        });

        const mixer = new THREE.AnimationMixer(door);
        var action;
        const playAnimation = (animName)=>{
          if(action !== undefined){
              action.stop();
          }
          action = mixer.clipAction(THREE.AnimationClip.findByName( gltf.animations, animName ));
          action.setLoop( THREE.LoopOnce );
          action.clampWhenFinished = true;
          action.play();
        }

        room.userData.door = {
          model:door,
          mixer:mixer,
          open:()=>playAnimation('DoorOpen'),
          close:()=>playAnimation('DoorClose')
        }
      }
    );

    var onUpdate = (delta)=>{
      if(room.userData.door != undefined){
        room.userData.door.mixer.update(delta);
      }

    }
    room.userData.onUpdate = onUpdate;
    
    // Load lamp
    loader.load(
      './assets/lamp.glb',
      function ( gltf ) {

        const lamp = gltf.scene;
        room.add( lamp );
        lamp.position.set(0,s.y-ecart,-s.z*0.5);
        lamp.scale.set(0.5,0.5,0.5);

        var bulb;

        gltf.scene.traverse( function ( child ) {

          if ( child.isMesh && child.name=='Bulb') {
              bulb=child;
              bulb.material.emissive.r = 0;
              bulb.material.emissive.g = 0;
              bulb.material.emissive.b = 0;
          }
        });
        const intensity = 2;
        room.userData.lamp = {
          position:new THREE.Vector3(p.x,p.y + s.y + bulb.position.y,-s.z*0.5),
          switch:(state)=>{
            const tween = new TWEEN.Tween(bulb.material.emissive)
              .to({r:state?intensity:0,g:state?intensity:0,b:state?intensity:0 }, 100)
              .easing(TWEEN.Easing.Quadratic.Out)
              .start();
            }
          }
        


      });
    
    room.position.set(p.x,p.y,p.z);
    



    scene.add(room);
    
    return room;
  }