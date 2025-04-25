let OBJLoader = 'three-obj-loader';
let modelPath = "model/head_geometry.obj";

// Vertex Shader
const vertexShader = `
uniform vec3 uDragStart;
uniform vec3 uDragTarget;
uniform float uTime;
uniform float uDragReleaseTime;
uniform bool uDragRelease;

varying vec2 vUv;
varying float vDistortion;

void main() {
    float area = 0.1;
    float elasticity = 0.3;
    float bounce = -3.0;

    float startToTarget = distance(uDragTarget, uDragStart);
    float distanceToStart = distance(position, uDragStart);

    float influence = distanceToStart / (area + elasticity * startToTarget);
    float distortion = exp(influence * -3.2);

    vUv = uv;

    if (uDragRelease) {
        float timeSinceRelease = uTime - uDragReleaseTime;
        distortion *= exp(bounce * timeSinceRelease);
        distortion *= sin(timeSinceRelease * 60.0);
    }

    vec3 stretch = (uDragTarget - uDragStart) * distortion;
    vec3 pos = position + stretch;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    vDistortion = distortion;
}
`;

// Fragment Shader
const fragmentShader = `
varying float vDistortion;
uniform sampler2D myT;
varying vec2 vUv;

void main() {
    gl_FragColor = texture2D(myT, vUv);
}
`;

class World {
  constructor() {
    this.width = windowWidth;
    this.height = windowHeight;
    this.time = 0;

    this.overObjectRight = false;
    this.overObjectLeft = false;
    this.isDraggingRight = false;
    this.isDraggingLeft = false;

    this.isRightDragging = false;
    this.isLeftDragging = false;
  }

  threeSetup() {

    // Initialize Scene
    this.scene = new THREE.Scene();

    // Initialize Camera 
    this.camera = new THREE.PerspectiveCamera(
      65,
      this.width / this.height,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 100); 
    this.camera.lookAt(0, 0, 0);
    this.camera.rotation.set(0, 0, 0);

    // Initialize Rendered 
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }); //Alpha creates transparent BG, antualias smooths model edges
    this.renderer.setSize(this.width, this.height);
    document.body.appendChild(this.renderer.domElement);

    // Initialize Light
    this.light = new THREE.DirectionalLight(0xffffff, 1);
    this.light.position.set(5, 5, 5);
    this.scene.add(this.light);

    // Initialize Raycasters
    this.rightModelRaycaster = new THREE.Raycaster();
    this.rightPlaneRaycaster = new THREE.Raycaster();

    this.leftModelRaycaster = new THREE.Raycaster();
    this.leftPlaneRaycaster = new THREE.Raycaster();
  }

  setTouchTarget() {
    // This is a transparent plane that allows the raycaster to track while dragging. 

    this.planeGeometry = new THREE.PlaneGeometry(this.width, this.height);
    this.planeMaterial = new THREE.MeshBasicMaterial({ opacity: 0, transparent: true });
    
    this.touchTarget = new THREE.Mesh(this.planeGeometry, this.planeMaterial);
    this.scene.add(this.touchTarget);
  }

  loadCustomModel() {
    // Taken from outside of class so I can make this dynamic one day when I'm older
    this.modelPath = modelPath;

    // Loading Model Texture
    const textureLoader = new THREE.TextureLoader()
    this.modelTexture = textureLoader.load("model/Bust_Mat_normal.jpeg");

    // Define the ShaderMaterial
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        myT: {value: this.modelTexture},
        uDragStart: { value: new THREE.Vector3() },    // Starting drag point
        uDragTarget: { value: new THREE.Vector3() },   // Current drag point
        uTime: { value: 0 },                           // Elapsed time
        uDragReleaseTime: { value: 0 },                // Time of drag release
        uDragRelease: { value: false },                // Is drag released?
      },
    });

    // Load the model 
    this.loader = new THREE.OBJLoader();
    this.loader.load(
      this.modelPath,
      (obj) => {
        this.model = obj;

        // Apply the material to each mesh in the model 
        this.model.traverse((child) => {
          if (child.isMesh) {
            child.geometry.center();
            child.material = this.material; // This is where we are defining the material for the model
            child.geometry = child.geometry.toNonIndexed(); // Ensure geometry works with shaders
            this.model.scale.set(100, 100, 100); // Scale the model
            this.model.rotation.set(0,0,0);
          }
        });

        // Add the model to the scene
        this.scene.add(this.model);
        console.log("Model loaded successfully!");
      }
    );
  }

  rightRayCaster(){
    if (hands.length > 0) {
      for (let hand of hands) {
        if (hand.handedness === "Right"){
          
          this.NormalizedRightIndexPos = new THREE.Vector3;
          this.NormalizedRightIndexPos.x = (hand.index_finger_tip.x / this.width) * 2 - 1;
          this.NormalizedRightIndexPos.y = - (hand.index_finger_tip.y / this.width) * 2 + 1;
          this.NormalizedRightIndexPos.z = (hand.index_finger_tip.z - 0.1) / (1000 - 0.1); // zNormalized = (zWorld - zNear) / (zFar - zNear)

          this.rightModelRaycaster.setFromCamera(this.NormalizedRightIndexPos, this.camera);
          this.intersectsModelRight = this.rightModelRaycaster.intersectObject(this.model, true);
          
          if(this.intersectsModelRight.length){
            this.overObjectRight = true;
            console.log(this.overObjectRight)
          } else {
            this.overObjectRight = false;
          }
    }
  }
}
}

  onPinchRight(){
  if (rightPinch && this.overObjectRight){
    this.isDraggingRight = true;
  }
  if (rightPinch && this.isDraggingRight){
    // Normalize right pinch 
    this.NormalizedRightPinchPos = new THREE.Vector3;
    this.NormalizedRightPinchPos.x = (rightPinchPos.x / this.width) * 2 - 1;
    this.NormalizedRightPinchPos.y = - (rightPinchPos.y / this.width) * 2 + 1;
    this.NormalizedRightPinchPos.z = (rightPinchPos.z - 0.1) / (1000 - 0.1); // zNormalized = (zWorld - zNear) / (zFar - zNear)
    
    // Right model raycaster
    this.rightModelRaycaster.setFromCamera(this.NormalizedRightPinchPos, this.camera);
    const intersectsModelRight = this.rightModelRaycaster.intersectObject(this.model, true);

    // If pinch intersects with model update shader
  if (intersectsModelRight.length && this.isDraggingRight) {
    const worldModelPosition = intersectsModelRight[0].point;
    
    // Convert world position to local model coordinates
    const localModelPosition = this.model.worldToLocal(worldModelPosition.clone());

    this.model.traverse((child) => {
      if (child.isMesh) {
        child.material.uniforms.uDragStart.value.copy(localModelPosition);
        child.material.uniforms.uDragTarget.value.copy(localModelPosition);
        child.material.uniforms.uDragRelease.value = false;
      }
    });
  }

    // Right plane raycaster
    this.rightPlaneRaycaster.setFromCamera(this.NormalizedRightPinchPos, this.camera);
    const intersectsPlaneRight = this.rightPlaneRaycaster.intersectObject(this.touchTarget, true); 

    // Update shader according to intersection with transparent plane
    if (intersectsPlaneRight.length) {
      const worldPlanePosition = intersectsPlaneRight[0].point;
  
      // Convert world position to local model coordinates
      const localPlanePosition = this.model.worldToLocal(worldPlanePosition.clone());
  
      this.model.traverse((child) => {
        if (child.isMesh) {
          child.material.uniforms.uDragTarget.value.copy(localPlanePosition);
        }
      });
    } if (intersectsModelRight.length || intersectsPlaneRight.length) {
      this.isDraggingRight = true; // Ensure drag state is correctly set
} 
} else {
  this.onRightPinchRelease(); // Trigger release if pinch is no longer detected
}
}

  onRightPinchRelease() {
    if (!this.rightPinch && this.isDraggingRight) {
      this.isDraggingRight = false;
      this.model.traverse((child) => {
        if (child.isMesh) {
          child.material.uniforms.uDragReleaseTime.value = this.time;
          child.material.uniforms.uDragRelease.value = true;
        }
      });
    } 
  }

  leftRayCaster() {
    if (hands.length > 0) {
      for (let hand of hands) {
        if (hand.handedness === "Left") {
          this.NormalizedLeftIndexPos = new THREE.Vector3;
          this.NormalizedLeftIndexPos.x = (hand.index_finger_tip.x / this.width) * 2 - 1;
          this.NormalizedLeftIndexPos.y = - (hand.index_finger_tip.y / this.width) * 2 + 1;
          this.NormalizedLeftIndexPos.z = (hand.index_finger_tip.z - 0.1) / (1000 - 0.1); // zNormalized = (zWorld - zNear) / (zFar - zNear)
  
          this.leftModelRaycaster.setFromCamera(this.NormalizedLeftIndexPos, this.camera);
          this.intersectsModelLeft = this.leftModelRaycaster.intersectObject(this.model, true);
          
          if (this.intersectsModelLeft.length) {
            this.overObjectLeft = true;
          } else {
            this.overObjectLeft = false;
          }
        }
      }
    }
  }
  
  onPinchLeft() {
    if (leftPinch && this.overObjectLeft) {
      this.isDraggingLeft = true;
    }
    if (leftPinch && this.isDraggingLeft) {
      // Normalize left pinch 
      this.NormalizedLeftPinchPos = new THREE.Vector3;
      this.NormalizedLeftPinchPos.x = (leftPinchPos.x / this.width) * 2 - 1;
      this.NormalizedLeftPinchPos.y = - (leftPinchPos.y / this.width) * 2 + 1;
      this.NormalizedLeftPinchPos.z = (leftPinchPos.z - 0.1) / (1000 - 0.1); // zNormalized = (zWorld - zNear) / (zFar - zNear)
      
      // Left model raycaster
      this.leftModelRaycaster.setFromCamera(this.NormalizedLeftPinchPos, this.camera);
      const intersectsModelLeft = this.leftModelRaycaster.intersectObject(this.model, true);
  
      // If pinch intersects with model update shader
      if (intersectsModelLeft.length && this.isDraggingLeft) {
        const worldModelPosition = intersectsModelLeft[0].point;
        
        // Convert world position to local model coordinates
        const localModelPosition = this.model.worldToLocal(worldModelPosition.clone());
  
        this.model.traverse((child) => {
          if (child.isMesh) {
            child.material.uniforms.uDragStart.value.copy(localModelPosition);
            child.material.uniforms.uDragTarget.value.copy(localModelPosition);
            child.material.uniforms.uDragRelease.value = false;
          }
        });
      }
  
      // Left plane raycaster
      this.leftPlaneRaycaster.setFromCamera(this.NormalizedLeftPinchPos, this.camera);
      const intersectsPlaneLeft = this.leftPlaneRaycaster.intersectObject(this.touchTarget, true); 
  
      // Update shader according to intersection with transparent plane
      if (intersectsPlaneLeft.length) {
        const worldPlanePosition = intersectsPlaneLeft[0].point;
    
        // Convert world position to local model coordinates
        const localPlanePosition = this.model.worldToLocal(worldPlanePosition.clone());
    
        this.model.traverse((child) => {
          if (child.isMesh) {
            child.material.uniforms.uDragTarget.value.copy(localPlanePosition);
          }
        });
      }
      if (intersectsModelLeft.length || intersectsPlaneLeft.length) {
        this.isDraggingLeft = true; // Ensure drag state is correctly set
      }
    } else {
      this.onLeftPinchRelease(); // Trigger release if pinch is no longer detected
    }
  }
  
  onLeftPinchRelease() {
    if (!this.leftPinch && this.isDraggingLeft) {
      this.isDraggingLeft = false;
      this.model.traverse((child) => {
        if (child.isMesh) {
          child.material.uniforms.uDragReleaseTime.value = this.time;
          child.material.uniforms.uDragRelease.value = true;
        }
      });
    }
  }

  onResize() {
    this.renderer.setSize(this.width, this.height);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
  }

  addListeners() {
    window.addEventListener("resize", this.onResize.bind(this));
  }

  render() {
    this.time += 0.01633;
    if (this.model) {
      this.model.traverse((child) => {
        if (child.isMesh) {
          child.material.uniforms.uTime.value = this.time;
        }
      });
      //this.resetAfterRelease();
    }
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.render);
  }
}