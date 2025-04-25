// Model paths

let OBJLoader = 'three-obj-loader';

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
    this.width = displayWidth;
    this.height = displayHeight;
    this.time = 0;

    this.overObject = false;
    this.isDragging = false; 

    this.figure = figures[0];
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
    this.light = new THREE.DirectionalLight(0xffffff, 100);
    this.light.position.set(5, 5, 0);
    this.scene.add(this.light);

    // Initialize Raycasters
    this.modelRaycaster = new THREE.Raycaster();
    this.planeRaycaster = new THREE.Raycaster();
  }

  setTouchTarget() {
    // This is a transparent plane that allows the raycaster to track while dragging. 

    this.planeGeometry = new THREE.PlaneGeometry(this.width, this.height);
    this.planeMaterial = new THREE.MeshBasicMaterial({ opacity: 0, transparent: true });
    
    this.touchTarget = new THREE.Mesh(this.planeGeometry, this.planeMaterial);
    this.scene.add(this.touchTarget);
  }

  loadCustomModel(figure) {

    // Loading Model Texture
    const textureLoader = new THREE.TextureLoader()
    this.modelTexture = textureLoader.load(this.figure.texture);

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
      this.figure.geo,
      (obj) => {
        this.model = obj;

        // Apply the material to each mesh in the model 
        this.model.traverse((child) => {
          if (child.isMesh) {
            child.geometry.center();
            child.material = this.material; // This is where we are defining the material for the model
            child.geometry = child.geometry.toNonIndexed(); // Ensure geometry works with shaders
            this.model.scale.set(this.figure.scaleValue, this.figure.scaleValue, this.figure.scaleValue); // Scale the model
            this.model.rotation.set(0, 0, 0);
          }
        });

        // Add the model to the scene
        this.scene.add(this.model);
        console.log("Model loaded successfully!");
      }
    );
  }

  rayCaster(){
    if (hands.length > 0) {
      for (let hand of hands) {
          this.NormalizedIndexPos = new THREE.Vector3;
          this.NormalizedIndexPos.x = (hand.index_finger_tip.x / this.width) * 2 - 1;
          this.NormalizedIndexPos.y = - (hand.index_finger_tip.y / this.width) * 2 + 1;
          this.NormalizedIndexPos.z = (hand.index_finger_tip.z - 0.1) / (1000 - 0.1); // zNormalized = (zWorld - zNear) / (zFar - zNear)

          this.modelRaycaster.setFromCamera(this.NormalizedIndexPos, this.camera);
          this.intersectsModel = this.modelRaycaster.intersectObject(this.model, true);
          
          if(this.intersectsModel.length){
            this.overObject = true;
            console.log(this.overObject)
          } else {
            this.overObject = false;
          }
    }
  }
}

  onPinch(){
  if (pinch && this.overObject){
    this.isDragging = true;
  }
  if (pinch && this.isDragging){
    // Normalize pinch 
    this.NormalizedPinchPos = new THREE.Vector3;
    this.NormalizedPinchPos.x = (pinchPos.x / this.width) * 2 - 1;
    this.NormalizedPinchPos.y = - (pinchPos.y / this.width) * 2 + 1;
    this.NormalizedPinchPos.z = (pinchPos.z - 0.1) / (1000 - 0.1); // zNormalized = (zWorld - zNear) / (zFar - zNear)
    
    // Model raycaster
    this.modelRaycaster.setFromCamera(this.NormalizedPinchPos, this.camera);
    const intersectsModel = this.modelRaycaster.intersectObject(this.model, true);

    // If pinch intersects with model update shader
  if (intersectsModel.length && this.isDragging) {
    const worldModelPosition = intersectsModel[0].point;
    
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

    // Plane raycaster
    this.planeRaycaster.setFromCamera(this.NormalizedPinchPos, this.camera);
    const intersectsPlane = this.planeRaycaster.intersectObject(this.touchTarget, true); 

    // Update shader according to intersection with transparent plane
    if (intersectsPlane.length) {
      const worldPlanePosition = intersectsPlane[0].point;
  
      // Convert world position to local model coordinates
      const localPlanePosition = this.model.worldToLocal(worldPlanePosition.clone());
  
      this.model.traverse((child) => {
        if (child.isMesh) {
          child.material.uniforms.uDragTarget.value.copy(localPlanePosition);
        }
      });
    } if (intersectsModel.length || intersectsPlane.length) {
      this.isDragging = true; // Ensure drag state is correctly set
} 
} else {
  this.onPinchRelease(); // Trigger release if pinch is no longer detected
}
}

  onPinchRelease() {
    if (!this.Pinch && this.isDragging) {
      this.isDragging = false;
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
    }
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.render);
  }
}