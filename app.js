import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

class ImageEditor {
    constructor(image, screenAspect, onApply) {
        this.image = image;
        this.screenAspect = screenAspect;
        this.onApply = onApply;
        
        this.canvas = document.getElementById('editorCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Transform parameters
        this.rotation = 270;
        this.scale = 1;
        this.posX = 0;
        this.posY = 0;
        
        this.setupCanvas();
        this.setupControls();
        this.draw();
    }
    
    setupCanvas() {
        // Canvas dimensions (simulating phone screen aspect ratio)
        const canvasHeight = 600;
        const canvasWidth = Math.round(canvasHeight * this.screenAspect);
        
        this.canvas.width = canvasWidth;
        this.canvas.height = canvasHeight;
        
        console.log('Editor canvas:', canvasWidth, 'x', canvasHeight, 'aspect:', this.screenAspect.toFixed(2));
    }
    
    setupControls() {
        const editorRot = document.getElementById('editorRot');
        const editorRotValue = document.getElementById('editorRotValue');
        const editorScale = document.getElementById('editorScale');
        const editorScaleValue = document.getElementById('editorScaleValue');
        const editorPosX = document.getElementById('editorPosX');
        const editorPosXValue = document.getElementById('editorPosXValue');
        const editorPosY = document.getElementById('editorPosY');
        const editorPosYValue = document.getElementById('editorPosYValue');
        
        editorRot.addEventListener('input', (e) => {
            this.rotation = parseFloat(e.target.value);
            editorRotValue.textContent = `${this.rotation}°`;
            this.draw();
        });
        
        editorScale.addEventListener('input', (e) => {
            this.scale = parseFloat(e.target.value);
            editorScaleValue.textContent = this.scale.toFixed(2);
            this.draw();
        });
        
        editorPosX.addEventListener('input', (e) => {
            this.posX = parseInt(e.target.value);
            editorPosXValue.textContent = this.posX;
            this.draw();
        });
        
        editorPosY.addEventListener('input', (e) => {
            this.posY = parseInt(e.target.value);
            editorPosYValue.textContent = this.posY;
            this.draw();
        });
        
        document.getElementById('btnResetEditor').addEventListener('click', () => {
            this.rotation = 270;
            this.scale = 1;
            this.posX = 0;
            this.posY = 0;
            
            editorRot.value = 270;
            editorRotValue.textContent = '270°';
            editorScale.value = 1;
            editorScaleValue.textContent = '1.00';
            editorPosX.value = 0;
            editorPosXValue.textContent = '0';
            editorPosY.value = 0;
            editorPosYValue.textContent = '0';
            
            this.draw();
        });
    }
    
    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#111827';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Save context
        this.ctx.save();
        
        // Transform
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.rotate(this.rotation * Math.PI / 180);
        this.ctx.scale(this.scale, this.scale);
        this.ctx.translate(this.posX, this.posY);
        
        // Draw image centered
        this.ctx.drawImage(
            this.image,
            -this.image.width / 2,
            -this.image.height / 2,
            this.image.width,
            this.image.height
        );
        
        // Restore context
        this.ctx.restore();
    }
    
    getProcessedCanvas() {
        // Create final canvas with proper dimensions
        const finalCanvas = document.createElement('canvas');
        const finalCtx = finalCanvas.getContext('2d');
        
        finalCanvas.width = this.canvas.width * 2; // High res
        finalCanvas.height = this.canvas.height * 2;
        
        // Scale for high res
        finalCtx.scale(2, 2);
        
        // Clear
        finalCtx.fillStyle = '#000000';
        finalCtx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Apply same transforms
        finalCtx.translate(this.canvas.width / 2, this.canvas.height / 2);
        finalCtx.rotate(this.rotation * Math.PI / 180);
        finalCtx.scale(this.scale, this.scale);
        finalCtx.translate(this.posX, this.posY);
        
        // Draw image
        finalCtx.drawImage(
            this.image,
            -this.image.width / 2,
            -this.image.height / 2,
            this.image.width,
            this.image.height
        );
        
        return finalCanvas;
    }
}

class PhoneMockupApp {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.phone = null;
        this.screenMesh = null;
        this.userImage = null;
        this.allMeshes = []; // Store all meshes for manual selection
        this.currentTexture = null; // Store current texture for adjustments
        this.isEditingTexture = false;
        this.isDraggingTexture = false;
        this.lastPointer = { x: 0, y: 0 };
        this.editSensitivity = 0.004;
        this.raycaster = new THREE.Raycaster();
        this.pointer = new THREE.Vector2();
        
        this.init();
        this.setupEventListeners();
    }

    init() {
        // Scene
        this.scene = new THREE.Scene();
        // Keep background for editing, will be removed during export
        this.scene.background = new THREE.Color(0x1e293b);

        // Camera
        const canvas = document.getElementById('canvas3d');
        const aspect = canvas.clientWidth / canvas.clientHeight;
        this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
        this.camera.position.set(0, 0, 8);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ 
            canvas,
            antialias: true,
            preserveDrawingBuffer: true,
            alpha: true // Enable transparency
        });
        this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;

        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 3;
        this.controls.maxDistance = 15;

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
        mainLight.position.set(5, 5, 5);
        this.scene.add(mainLight);

        const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
        fillLight.position.set(-5, 0, -5);
        this.scene.add(fillLight);

        const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
        backLight.position.set(0, -5, -5);
        this.scene.add(backLight);

        // Load 3D model
        this.loadPhoneModel();

        // Animation loop
        this.animate();

        // Handle resize
        window.addEventListener('resize', () => this.onWindowResize());
    }

    toggleEditMode(enabled) {
        this.isEditingTexture = enabled !== undefined ? enabled : !this.isEditingTexture;
        const btn = document.getElementById('btnToggleEdit');
        const hint = document.getElementById('editHint');
        if (btn && hint) {
            if (this.isEditingTexture) {
                btn.classList.add('active');
                hint.style.display = 'inline-block';
            } else {
                btn.classList.remove('active');
                hint.style.display = 'none';
                this.isDraggingTexture = false;
            }
        }
    }

    intersectsScreenMesh(event) {
        if (!this.screenMesh) return false;
        const rect = this.renderer.domElement.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        this.pointer.set(x, y);
        this.raycaster.setFromCamera(this.pointer, this.camera);
        const intersects = this.raycaster.intersectObject(this.screenMesh, true);
        return intersects.length > 0;
    }

    setupTextureEditingControls() {
        const canvasEl = this.renderer.domElement;
        // Button removed from UI
        // const btn = document.getElementById('btnToggleEdit');
        // if (btn) btn.addEventListener('click', () => this.toggleEditMode());

        canvasEl.addEventListener('pointerdown', (e) => {
            if (!this.isEditingTexture || !this.currentTexture) return;
            if (!this.intersectsScreenMesh(e)) return;
            this.isDraggingTexture = true;
            this.lastPointer.x = e.clientX;
            this.lastPointer.y = e.clientY;
            canvasEl.setPointerCapture(e.pointerId);
        });

        canvasEl.addEventListener('pointermove', (e) => {
            if (!this.isEditingTexture || !this.currentTexture || !this.isDraggingTexture) return;
            const rect = canvasEl.getBoundingClientRect();
            const dx = (e.clientX - this.lastPointer.x) / rect.width;
            const dy = (e.clientY - this.lastPointer.y) / rect.height;
            this.lastPointer.x = e.clientX;
            this.lastPointer.y = e.clientY;
            if (e.altKey) {
                // Rotate with horizontal movement
                this.currentTexture.center.set(0.5, 0.5);
                this.currentTexture.rotation += dx * Math.PI;
            } else {
                // Pan in texture space
                this.currentTexture.offset.x -= dx;
                this.currentTexture.offset.y += dy;
            }
            this.currentTexture.needsUpdate = true;
            if (this.screenMesh && this.screenMesh.material) {
                this.screenMesh.material.needsUpdate = true;
            }
        });

        canvasEl.addEventListener('pointerup', (e) => {
            if (!this.isDraggingTexture) return;
            this.isDraggingTexture = false;
            try { canvasEl.releasePointerCapture(e.pointerId); } catch {}
        });

        canvasEl.addEventListener('wheel', (e) => {
            if (!this.isEditingTexture || !this.currentTexture) return;
            if (!this.intersectsScreenMesh(e)) return;
            e.preventDefault();
            const factor = e.deltaY > 0 ? 1.1 : 0.9;
            const nx = THREE.MathUtils.clamp(this.currentTexture.repeat.x * factor, 0.05, 10);
            const ny = THREE.MathUtils.clamp(this.currentTexture.repeat.y * factor, 0.05, 10);
            this.currentTexture.repeat.set(nx, ny);
            this.currentTexture.center.set(0.5, 0.5);
            this.currentTexture.needsUpdate = true;
        }, { passive: false });

        canvasEl.addEventListener('dblclick', () => {
            if (!this.isEditingTexture || !this.currentTexture) return;
            this.currentTexture.center.set(0.5, 0.5);
            this.currentTexture.rotation = THREE.MathUtils.degToRad(270);
            this.currentTexture.repeat.set(1, 1);
            this.currentTexture.offset.set(0, 0);
            this.currentTexture.needsUpdate = true;
        });
    }

    loadPhoneModel() {
        const loader = new GLTFLoader();
        
        loader.load(
            '3DModels/models_iphone-15-pro-max.glb',
            (gltf) => {
                this.phone = gltf.scene;
                
                // Scale and position the phone
                const box = new THREE.Box3().setFromObject(this.phone);
                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = 4 / maxDim;
                this.phone.scale.multiplyScalar(scale);

                // Center the phone
                box.setFromObject(this.phone);
                const center = box.getCenter(new THREE.Vector3());
                this.phone.position.sub(center);

                // Find the screen mesh and setup screen material
                console.log('Searching for screen mesh...');
                let foundMeshes = [];
                
                this.phone.traverse((child) => {
                    if (child.isMesh) {
                        console.log('Mesh found:', child.name, child.material?.name);
                        foundMeshes.push({ name: child.name, materialName: child.material?.name });
                        this.allMeshes.push(child); // Store for manual selection
                        
                        // Disable front_glass01 by default
                        if (child.name.toLowerCase() === 'front_glass01') {
                            child.visible = false;
                            console.log('✓ front_glass01 disabled by default');
                        }
                        
                        // Look for screen_01 specifically first
                        if (child.name === 'screen_01' || child.name === 'screen01') {
                            console.log('✓ Screen mesh found by exact name:', child.name);
                            this.screenMesh = child;
                            this.setupScreenMaterial(child);
                        }
                        // Fallback to pattern matching (but exclude border, glass, rim)
                        else if (!this.screenMesh) {
                            const nameLower = child.name.toLowerCase();
                            if ((nameLower.includes('screen') || nameLower.includes('display') || 
                                 nameLower.includes('screen_bg')) 
                                && !nameLower.includes('glass') && !nameLower.includes('rim') 
                                && !nameLower.includes('border')) {
                                console.log('✓ Screen mesh found by pattern:', child.name);
                                this.screenMesh = child;
                                this.setupScreenMaterial(child);
                            }
                        }
                        // Material name and emissive checks disabled to prioritize exact name match
                    }
                });
                
                console.log('All meshes found:', foundMeshes);
                console.log('Screen mesh selected:', this.screenMesh?.name || 'NONE');
                
                // If no screen mesh found, try to find the largest flat mesh as fallback
                if (!this.screenMesh) {
                    console.warn('⚠️ No screen mesh found by name/material, trying fallback...');
                    let largestArea = 0;
                    
                    this.phone.traverse((child) => {
                        if (child.isMesh && child.geometry) {
                            // Calculate approximate area
                            const bbox = new THREE.Box3().setFromObject(child);
                            const size = bbox.getSize(new THREE.Vector3());
                            const area = size.x * size.y;
                            
                            // Look for relatively flat meshes (likely the screen)
                            if (area > largestArea && size.z < size.x && size.z < size.y) {
                                largestArea = area;
                                this.screenMesh = child;
                            }
                        }
                    });
                    
                    if (this.screenMesh) {
                        console.log('✓ Screen mesh found by fallback heuristic:', this.screenMesh.name);
                        this.setupScreenMaterial(this.screenMesh);
                    }
                }

                this.scene.add(this.phone);
                
                // Populate mesh selector
                this.populateMeshSelector();
                // In-canvas editing disabled
                // this.setupTextureEditingControls();
                
                // Hide loading
                document.getElementById('loading').classList.add('hidden');
            },
            (progress) => {
                const percent = (progress.loaded / progress.total) * 100;
                console.log(`Loading: ${percent.toFixed(2)}%`);
            },
            (error) => {
                console.error('Error loading model:', error);
                document.getElementById('loading').innerHTML = '<p>Erreur de chargement du modèle 3D</p>';
            }
        );
    }

    setupScreenMaterial(mesh) {
        // Create a default dark screen material
        const screenMaterial = new THREE.MeshStandardMaterial({
            color: 0x000000,
            emissive: 0x111111,
            emissiveIntensity: 0.5,
            metalness: 0.1,
            roughness: 0.2
        });
        
        mesh.material = screenMaterial;
    }

    populateMeshSelector() {
        const meshSelector = document.getElementById('meshSelector');
        const screenMeshSelect = document.getElementById('screenMeshSelect');
        
        // Show selector if we have meshes
        if (this.allMeshes.length > 0) {
            meshSelector.style.display = 'block';
            
            // Clear existing options (except the first one)
            while (screenMeshSelect.options.length > 1) {
                screenMeshSelect.remove(1);
            }
            
            // Add all meshes to selector
            this.allMeshes.forEach((mesh, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = mesh.name || `Mesh ${index + 1}`;
                
                // Mark and select the currently selected screen mesh
                if (mesh === this.screenMesh) {
                    option.textContent += ' ✓';
                    option.selected = true; // Auto-select the detected screen
                }
                
                screenMeshSelect.appendChild(option);
            });
        }
        
        // Populate mesh visibility toggles
        this.populateMeshVisibility();
    }
    
    populateMeshVisibility() {
        const meshVisibility = document.getElementById('meshVisibility');
        const meshList = document.getElementById('meshList');
        
        if (this.allMeshes.length > 0) {
            meshVisibility.style.display = 'block';
            meshList.innerHTML = '';
            
            this.allMeshes.forEach((mesh, index) => {
                const item = document.createElement('div');
                item.className = 'mesh-item';
                
                const label = document.createElement('label');
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = mesh.visible;
                checkbox.id = `mesh-toggle-${index}`;
                
                checkbox.addEventListener('change', (e) => {
                    mesh.visible = e.target.checked;
                });
                
                const meshName = document.createElement('span');
                meshName.textContent = mesh.name || `Mesh ${index + 1}`;
                
                label.appendChild(checkbox);
                label.appendChild(meshName);
                item.appendChild(label);
                meshList.appendChild(item);
            });
        }
    }

    getScreenAspectRatio(screenMesh) {
        const geometry = screenMesh.geometry;
        const uvAttribute = geometry.attributes.uv;
        
        if (!uvAttribute) {
            console.warn('No UV attribute found, using default aspect');
            return 2.16; // iPhone default aspect ratio
        }
        
        // Calculate UV bounds
        let minU = Infinity, maxU = -Infinity;
        let minV = Infinity, maxV = -Infinity;
        
        for (let i = 0; i < uvAttribute.count; i++) {
            const u = uvAttribute.getX(i);
            const v = uvAttribute.getY(i);
            minU = Math.min(minU, u);
            maxU = Math.max(maxU, u);
            minV = Math.min(minV, v);
            maxV = Math.max(maxV, v);
        }
        
        const uvWidth = maxU - minU;
        const uvHeight = maxV - minV;
        return uvWidth / uvHeight;
    }

    preprocessImageForScreen(image, screenAspect) {
        // Create a canvas to pre-process the image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Target dimensions (high quality)
        // Since we'll rotate 270°, we need to swap dimensions
        // Screen aspect is width/height of the final rotated result
        // So canvas should be height/width before rotation
        const targetHeight = 2048;
        const targetWidth = Math.round(targetHeight / screenAspect); // Inversed because of rotation
        
        // Set canvas size to target
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        
        // Calculate source dimensions for cropping (cover mode)
        const imageAspect = image.width / image.height;
        const canvasAspect = targetWidth / targetHeight; // Aspect of the canvas before rotation
        
        let sourceX = 0, sourceY = 0;
        let sourceWidth = image.width;
        let sourceHeight = image.height;
        
        if (imageAspect > canvasAspect) {
            // Image is wider - crop sides
            sourceWidth = image.height * canvasAspect;
            sourceX = (image.width - sourceWidth) / 2;
        } else {
            // Image is taller - crop top/bottom
            sourceHeight = image.width / canvasAspect;
            sourceY = (image.height - sourceHeight) / 2;
        }
        
        console.log('Preprocessing image:');
        console.log('  Original:', image.width, 'x', image.height, '(aspect:', imageAspect.toFixed(2), ')');
        console.log('  Canvas:', targetWidth, 'x', targetHeight, '(aspect:', canvasAspect.toFixed(2), ')');
        console.log('  After 270° rotation, canvas aspect will be:', screenAspect.toFixed(2));
        console.log('  Crop region:', sourceX.toFixed(0), sourceY.toFixed(0), sourceWidth.toFixed(0), sourceHeight.toFixed(0));
        
        // Don't rotate - just draw the image cropped and scaled to fit
        ctx.drawImage(
            image,
            sourceX, sourceY, sourceWidth, sourceHeight,
            0, 0, targetWidth, targetHeight
        );
        
        return canvas;
    }

    updateScreenWithImage(imageUrl) {
        // Directly apply and enter edit mode
        this.applyImageDirect(imageUrl);
    }
    
    applyImageDirect(imageUrl) {
        if (!this.screenMesh) {
            console.error('❌ Cannot update screen: Screen mesh not found!');
            alert('Erreur: L\'écran du téléphone n\'a pas pu être détecté dans le modèle 3D.');
            return;
        }
        const loader = new THREE.TextureLoader();
        loader.load(
            imageUrl,
            (texture) => {
                texture.colorSpace = THREE.SRGBColorSpace;
                texture.wrapS = THREE.ClampToEdgeWrapping;
                texture.wrapT = THREE.ClampToEdgeWrapping;
                texture.center.set(0.5, 0.5);
                texture.rotation = THREE.MathUtils.degToRad(180); // 180 degrees to flip
                texture.repeat.set(-1, 1); // Negative X to flip horizontally
                texture.offset.set(0, 0);
                this.currentTexture = texture;
                const mat = new THREE.MeshStandardMaterial({
                    map: texture,
                    emissive: 0xffffff,
                    emissiveMap: texture,
                    emissiveIntensity: 1.0,
                    metalness: 0,
                    roughness: 0.3,
                    side: THREE.DoubleSide
                });
                if (this.screenMesh.material) this.screenMesh.material.dispose();
                this.screenMesh.material = mat;
                mat.needsUpdate = true;
                
                // Update texture control sliders
                document.getElementById('textureRot').value = 180;
                document.getElementById('textureRotValue').textContent = '180°';
                document.getElementById('textureScaleX').value = -1;
                document.getElementById('textureScaleXValue').textContent = '-1.00';
                document.getElementById('textureScaleY').value = 1;
                document.getElementById('textureScaleYValue').textContent = '1.00';
                document.getElementById('textureOffsetX').value = 0;
                document.getElementById('textureOffsetXValue').textContent = '0.00';
                document.getElementById('textureOffsetY').value = 0;
                document.getElementById('textureOffsetYValue').textContent = '0.00';
                
                // Show texture controls
                document.getElementById('textureControls').style.display = 'block';
                
                // In-canvas editing disabled
                // this.toggleEditMode(true);
                if (this.renderer && this.scene && this.camera) {
                    this.renderer.render(this.scene, this.camera);
                }
            },
            undefined,
            (err) => {
                console.error('❌ Error loading texture', err);
            }
        );
    }

    openImageEditor(image, screenAspect) {
        const modal = document.getElementById('imageEditorModal');
        modal.classList.add('active');
        
        // Create editor
        const editor = new ImageEditor(image, screenAspect, (processedCanvas) => {
            this.applyProcessedImage(processedCanvas);
        });
        
        // Setup modal buttons
        document.getElementById('btnCloseEditor').onclick = () => {
            modal.classList.remove('active');
        };
        
        document.getElementById('btnCancelEditor').onclick = () => {
            modal.classList.remove('active');
        };
        
        document.getElementById('btnApplyEditor').onclick = () => {
            const processedCanvas = editor.getProcessedCanvas();
            this.applyProcessedImage(processedCanvas);
            modal.classList.remove('active');
        };
    }
    
    applyProcessedImage(processedCanvas) {
        // Create texture from processed canvas
        const texture = new THREE.CanvasTexture(processedCanvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.needsUpdate = true;
        
        console.log('✓ Applying processed image to phone');
        
        // Store texture for later adjustments
        this.currentTexture = texture;
        
        // Dispose old material
        if (this.screenMesh.material) {
            if (this.screenMesh.material.map) this.screenMesh.material.map.dispose();
            if (this.screenMesh.material.emissiveMap && this.screenMesh.material.emissiveMap !== this.screenMesh.material.map) {
                this.screenMesh.material.emissiveMap.dispose();
            }
            this.screenMesh.material.dispose();
        }
        
        // Create new material with processed texture
        const screenMaterial = new THREE.MeshStandardMaterial({
            map: texture,
            emissive: 0xffffff,
            emissiveMap: texture,
            emissiveIntensity: 1.0,
            metalness: 0,
            roughness: 0.3,
            side: THREE.DoubleSide
        });
        
        this.screenMesh.material = screenMaterial;
        screenMaterial.needsUpdate = true;
        
        console.log('✓ Screen material applied!');
        
        // Force render
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
        
        // Hide texture controls since we don't need them anymore
        document.getElementById('textureControls').style.display = 'none';
    }

    setupEventListeners() {
        // Get all texture control elements first
        const textureRot = document.getElementById('textureRot');
        const textureRotValue = document.getElementById('textureRotValue');
        const textureScaleX = document.getElementById('textureScaleX');
        const textureScaleXValue = document.getElementById('textureScaleXValue');
        const textureScaleY = document.getElementById('textureScaleY');
        const textureScaleYValue = document.getElementById('textureScaleYValue');
        const textureOffsetX = document.getElementById('textureOffsetX');
        const textureOffsetXValue = document.getElementById('textureOffsetXValue');
        const textureOffsetY = document.getElementById('textureOffsetY');
        const textureOffsetYValue = document.getElementById('textureOffsetYValue');
        const textureFlipY = document.getElementById('textureFlipY');
        
        // Manual mesh selection
        const screenMeshSelect = document.getElementById('screenMeshSelect');
        screenMeshSelect.addEventListener('change', (e) => {
            const index = parseInt(e.target.value);
            if (!isNaN(index) && this.allMeshes[index]) {
                console.log('Manually selecting mesh:', this.allMeshes[index].name);
                this.screenMesh = this.allMeshes[index];
                this.setupScreenMaterial(this.screenMesh);
                
                // Re-apply image if one was already loaded
                if (this.userImage) {
                    this.updateScreenWithImage(this.userImage);
                }
            }
        });
        
        // Image upload
        const imageInput = document.getElementById('imageInput');
        const uploadArea = document.getElementById('uploadArea');
        const btnBrowse = document.getElementById('btnBrowse');
        const btnRemove = document.getElementById('btnRemove');
        const imagePreview = document.getElementById('imagePreview');
        const previewImg = document.getElementById('previewImg');

        btnBrowse.addEventListener('click', () => imageInput.click());

        imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleImageFile(file);
            }
        });

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('drag-over');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                this.handleImageFile(file);
            }
        });

        btnRemove.addEventListener('click', () => {
            this.userImage = null;
            this.currentTexture = null;
            imagePreview.style.display = 'none';
            uploadArea.style.display = 'block';
            imageInput.value = '';
            
            // Hide texture controls
            document.getElementById('textureControls').style.display = 'none';
            
            // Reset texture control values
            textureRot.value = 180;
            textureRotValue.textContent = '180°';
            textureScaleX.value = -1;
            textureScaleXValue.textContent = '-1.0';
            textureScaleY.value = 1;
            textureScaleYValue.textContent = '1.0';
            textureOffsetX.value = 0;
            textureOffsetXValue.textContent = '0.0';
            textureOffsetY.value = 0;
            textureOffsetYValue.textContent = '0.0';
            textureFlipY.checked = false;
            
            // Reset screen to default
            if (this.screenMesh) {
                this.setupScreenMaterial(this.screenMesh);
            }
        });

        // Texture adjustment controls event listeners
        textureRot.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            textureRotValue.textContent = `${value}°`;
            if (this.currentTexture) {
                this.currentTexture.rotation = THREE.MathUtils.degToRad(value);
                this.currentTexture.needsUpdate = true;
                if (this.screenMesh && this.screenMesh.material) {
                    this.screenMesh.material.needsUpdate = true;
                }
            }
        });

        textureScaleX.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            textureScaleXValue.textContent = value.toFixed(2);
            if (this.currentTexture) {
                this.currentTexture.repeat.x = value;
                this.currentTexture.needsUpdate = true;
            }
        });

        textureScaleY.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            textureScaleYValue.textContent = value.toFixed(2);
            if (this.currentTexture) {
                this.currentTexture.repeat.y = value;
                this.currentTexture.needsUpdate = true;
            }
        });

        textureOffsetX.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            textureOffsetXValue.textContent = value.toFixed(2);
            if (this.currentTexture) {
                this.currentTexture.offset.x = value;
                this.currentTexture.needsUpdate = true;
            }
        });

        textureOffsetY.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            textureOffsetYValue.textContent = value.toFixed(2);
            if (this.currentTexture) {
                this.currentTexture.offset.y = value;
                this.currentTexture.needsUpdate = true;
            }
        });

        textureFlipY.addEventListener('change', (e) => {
            if (this.currentTexture) {
                this.currentTexture.flipY = e.target.checked;
                this.currentTexture.needsUpdate = true;
            }
        });

        // Rotation controls
        const rotX = document.getElementById('rotX');
        const rotY = document.getElementById('rotY');
        const rotZ = document.getElementById('rotZ');
        const rotXValue = document.getElementById('rotXValue');
        const rotYValue = document.getElementById('rotYValue');
        const rotZValue = document.getElementById('rotZValue');

        rotX.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            rotXValue.textContent = `${value}°`;
            if (this.phone) {
                this.phone.rotation.x = THREE.MathUtils.degToRad(value);
            }
        });

        rotY.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            rotYValue.textContent = `${value}°`;
            if (this.phone) {
                this.phone.rotation.y = THREE.MathUtils.degToRad(value);
            }
        });

        rotZ.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            rotZValue.textContent = `${value}°`;
            if (this.phone) {
                this.phone.rotation.z = THREE.MathUtils.degToRad(value);
            }
        });

        // Zoom control
        const zoom = document.getElementById('zoom');
        const zoomValue = document.getElementById('zoomValue');

        zoom.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            zoomValue.textContent = `${value.toFixed(1)}x`;
            if (this.phone) {
                this.phone.scale.setScalar(value);
            }
        });

        // Reset button
        document.getElementById('btnReset').addEventListener('click', () => {
            rotX.value = 0;
            rotY.value = 30;
            rotZ.value = 0;
            zoom.value = 1;
            rotXValue.textContent = '0°';
            rotYValue.textContent = '30°';
            rotZValue.textContent = '0°';
            zoomValue.textContent = '1.0x';
            
            if (this.phone) {
                this.phone.rotation.set(0, THREE.MathUtils.degToRad(30), 0);
                this.phone.scale.setScalar(1);
            }
            
            this.camera.position.set(0, 0, 8);
            this.controls.reset();
        });

        // Export button
        document.getElementById('btnExport').addEventListener('click', () => {
            this.exportToPNG();
        });
    }

    handleImageFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            this.userImage = e.target.result;
            
            // Show preview
            const previewImg = document.getElementById('previewImg');
            const imagePreview = document.getElementById('imagePreview');
            const uploadArea = document.getElementById('uploadArea');
            
            previewImg.src = this.userImage;
            imagePreview.style.display = 'block';
            uploadArea.style.display = 'none';
            
            // Update 3D model screen
            this.updateScreenWithImage(this.userImage);
        };
        reader.readAsDataURL(file);
    }

    exportToPNG() {
        const quality = parseInt(document.getElementById('exportQuality').value);
        
        // Store current state
        const currentWidth = this.renderer.domElement.width;
        const currentHeight = this.renderer.domElement.height;
        const currentPixelRatio = this.renderer.getPixelRatio();
        const currentBg = this.scene.background;
        
        // Set transparent background
        this.scene.background = null;
        
        // Calculate export dimensions
        const exportWidth = currentWidth * quality;
        const exportHeight = currentHeight * quality;
        
        // Temporarily adjust renderer
        this.renderer.setPixelRatio(1); // Set to 1 to avoid issues
        this.renderer.setSize(exportWidth, exportHeight, false); // false = don't update style
        
        // Update camera aspect ratio
        this.camera.aspect = exportWidth / exportHeight;
        this.camera.updateProjectionMatrix();
        
        // Render
        this.renderer.render(this.scene, this.camera);
        
        // Get the image
        const dataUrl = this.renderer.domElement.toDataURL('image/png');
        
        // Restore everything
        this.scene.background = currentBg;
        this.renderer.setPixelRatio(currentPixelRatio);
        this.renderer.setSize(currentWidth, currentHeight, false);
        this.camera.aspect = currentWidth / currentHeight;
        this.camera.updateProjectionMatrix();
        
        // Force a render to restore the view
        this.renderer.render(this.scene, this.camera);
        
        // Download
        const link = document.createElement('a');
        link.download = `phone-mockup-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
        
        console.log('✓ PNG exported with transparent background');
    }

    onWindowResize() {
        const canvas = document.getElementById('canvas3d');
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize the app
new PhoneMockupApp();

