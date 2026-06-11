import * as THREE from 'three/webgpu'
import { color, float, Fn, instancedArray, mix, normalWorld, positionGeometry, step, texture, uniform, uv, vec2, vec3, vec4 } from 'three/tsl'
import { Inputs } from '../../Inputs/Inputs.js'
import { InteractivePoints } from '../../InteractivePoints.js'
import { Area } from './Area.js'
import gsap from 'gsap'
import { MeshDefaultMaterial } from '../../Materials/MeshDefaultMaterial.js'

export class LandingArea extends Area
{
    constructor(model)
    {
        super(model)

        this.localTime = uniform(0)

        this.setLetters()
        this.setKiosk()
        this.setControls()
        this.setBonfire()
        this.setAchievement()
    }

    setLetters()
    {
        const references = this.references.items.get('letters')

        // Hide original letters and disable their physics
        for(const reference of references)
        {
            this.game.objects.disable(reference.userData.object)
        }

        // Generate SOCIAL RABBIT
        import('three/addons/loaders/TTFLoader.js').then(({ TTFLoader }) => {
        import('three/addons/loaders/FontLoader.js').then(({ FontLoader, Font }) => {
            import('three/addons/geometries/TextGeometry.js').then(({ TextGeometry }) => {
                const ttfLoader = new TTFLoader()
                ttfLoader.load('/fonts/Pally-Bold.ttf', 
                (json) =>
                {
                    const referenceNames = Array.from(this.references.items.keys());
                    console.log("AVAILABLE REFERENCES:", referenceNames);
                    
                    const font = new Font(json)
                    const text = 'SOCIAL RABBIT'
                    // Steal rotation from original text for diagonal alignment
                    const basePosition = references[0].position.clone()
                    const baseQuaternion = references[0].quaternion.clone()
                    const direction = new THREE.Vector3(1, 0, 0).applyQuaternion(baseQuaternion).normalize()
                    
                    // Shift text to the right along the path so 'SO' doesn't clip into the crates/lantern!
                    basePosition.add(direction.clone().multiplyScalar(2.5))
                    // Also move it slightly forward across the path to center it
                    const zDir = new THREE.Vector3(0, 0, 1).applyQuaternion(baseQuaternion).normalize()
                    basePosition.add(zDir.clone().multiplyScalar(0.5))

                    // Golden yellow material to pop against purple grass
                    const baseMaterial = new MeshDefaultMaterial({
                        colorNode: color(0xffcc00),
                        hasWater: false,
                        hasLightBounce: true
                    })

                    let currentDistance = 0
                    let previousWidth = 0
                    const letters = text.split('')

                    for(let i = 0; i < letters.length; i++)
                    {
                        const letter = letters[i]
                        if(letter === ' ')
                        {
                            currentDistance += (previousWidth * 0.5) + 0.8 // space width
                            previousWidth = 0
                            continue
                        }

                        const geometry = new TextGeometry(letter, {
                            font: font,
                            size: 1.5,
                            depth: 0.45,
                            curveSegments: 2,
                            bevelEnabled: true,
                            bevelThickness: 0.05,
                            bevelSize: 0.05,
                            bevelOffset: 0,
                            bevelSegments: 2
                        })
                        geometry.computeBoundingBox()
                        const width = geometry.boundingBox.max.x - geometry.boundingBox.min.x
                        const height = geometry.boundingBox.max.y - geometry.boundingBox.min.y
                        const depth = geometry.boundingBox.max.z - geometry.boundingBox.min.z

                        geometry.translate(-width * 0.5, -height * 0.5, -depth * 0.5)

                        if (previousWidth > 0) {
                            currentDistance += (previousWidth * 0.5) + 0.15 + (width * 0.5)
                        } else {
                            // First letter or letter after space starts with its left edge at currentDistance
                            currentDistance += width * 0.5
                        }

                        const mesh = new THREE.Mesh(geometry, baseMaterial)
                        mesh.position.copy(basePosition).add(direction.clone().multiplyScalar(currentDistance))
                        mesh.position.y += 0.5 // gentle drop so it doesn't blast or clip floor
                        
                        // Copy original rotation
                        mesh.quaternion.copy(baseQuaternion)
                        
                        const physicalDescription = {
                            type: 'dynamic',
                            position: mesh.position.clone(),
                            rotation: { x: mesh.quaternion.x, y: mesh.quaternion.y, z: mesh.quaternion.z, w: mesh.quaternion.w },
                            mass: 0.5,
                            friction: 0.5,
                            restitution: 0.15,
                            colliders: [{
                                shape: 'cuboid',
                                parameters: [width * 0.5, height * 0.5, depth * 0.5]
                            }],
                            onCollision: (force, position) =>
                            {
                                this.game.audio.groups.get('hitBrick').playRandomNext(force, position)
                            }
                        }

                        this.game.objects.add({
                            model: mesh,
                            castShadow: true,
                            receiveShadow: true,
                            updateMaterials: false
                        }, physicalDescription)

                        previousWidth = width
                    }
                },
                undefined,
                (error) => {
                    console.error('Font load ERROR:', error);
                })
            }).catch(e => console.error(e))
        }).catch(e => console.error(e))
        }).catch(e => console.error(e))
    }

    setKiosk()
    {
        // Interactive point
        const interactivePoint = this.game.interactivePoints.create(
            this.references.items.get('kioskInteractivePoint')[0].position,
            'Map',
            InteractivePoints.ALIGN_RIGHT,
            InteractivePoints.STATE_CONCEALED,
            () =>
            {
                this.game.inputs.interactiveButtons.clearItems()
                this.game.modals.open('map')
                // interactivePoint.hide()
            },
            () =>
            {
                this.game.inputs.interactiveButtons.addItems(['interact'])
            },
            () =>
            {
                this.game.inputs.interactiveButtons.removeItems(['interact'])
            },
            () =>
            {
                this.game.inputs.interactiveButtons.removeItems(['interact'])
            }
        )

        // this.game.map.items.get('map').events.on('close', () =>
        // {
        //     interactivePoint.show()
        // })
    }

    setControls()
    {
        // Interactive point
        const interactivePoint = this.game.interactivePoints.create(
            this.references.items.get('controlsInteractivePoint')[0].position,
            'Controls',
            InteractivePoints.ALIGN_RIGHT,
            InteractivePoints.STATE_CONCEALED,
            () =>
            {
                this.game.inputs.interactiveButtons.clearItems()
                this.game.menu.open('controls')
                interactivePoint.hide()
            },
            () =>
            {
                this.game.inputs.interactiveButtons.addItems(['interact'])
            },
            () =>
            {
                this.game.inputs.interactiveButtons.removeItems(['interact'])
            },
            () =>
            {
                this.game.inputs.interactiveButtons.removeItems(['interact'])
            }
        )

        // Menu instance
        const menuInstance = this.game.menu.items.get('controls')

        menuInstance.events.on('close', () =>
        {
            interactivePoint.show()
        })

        menuInstance.events.on('open', () =>
        {
            if(this.game.inputs.mode === Inputs.MODE_GAMEPAD)
                menuInstance.tabs.goTo('gamepad')
            else if(this.game.inputs.mode === Inputs.MODE_MOUSEKEYBOARD)
                menuInstance.tabs.goTo('mouse-keyboard')
            else if(this.game.inputs.mode === Inputs.MODE_TOUCH)
                menuInstance.tabs.goTo('touch')
        })
    }

    setBonfire()
    {
        const position = this.references.items.get('bonfireHashes')[0].position

        // Particles
        let particles = null
        {
            const emissiveMaterial = this.game.materials.getFromName('emissiveOrangeRadialGradient')
    
            const count = 30
            const elevation = uniform(5)
            const positions = new Float32Array(count * 3)
            const scales = new Float32Array(count)
    
    
            for(let i = 0; i < count; i++)
            {
                const i3 = i * 3
    
                const angle = Math.PI * 2 * Math.random()
                const radius = Math.pow(Math.random(), 1.5) * 1
                positions[i3 + 0] = Math.cos(angle) * radius
                positions[i3 + 1] = Math.random()
                positions[i3 + 2] = Math.sin(angle) * radius
    
                scales[i] = 0.02 + Math.random() * 0.06
            }
            
            const positionAttribute = instancedArray(positions, 'vec3').toAttribute()
            const scaleAttribute = instancedArray(scales, 'float').toAttribute()
    
            const material = new THREE.SpriteNodeMaterial()
            material.outputNode = emissiveMaterial.outputNode
    
            const progress = float(0).toVar()
    
            material.positionNode = Fn(() =>
            {
                const newPosition = positionAttribute.toVar()
                progress.assign(newPosition.y.add(this.localTime.mul(newPosition.y)).fract())
    
                newPosition.y.assign(progress.mul(elevation))
                newPosition.xz.addAssign(this.game.wind.direction.mul(progress))
    
                const progressHide = step(0.8, progress).mul(100)
                newPosition.y.addAssign(progressHide)
                
                return newPosition
            })()
            material.scaleNode = Fn(() =>
            {
                const progressScale = progress.remapClamp(0.5, 1, 1, 0)
                return scaleAttribute.mul(progressScale)
            })()
    
            const geometry = new THREE.CircleGeometry(0.5, 8)
    
            particles = new THREE.Mesh(geometry, material)
            particles.visible = false
            particles.position.copy(position)
            particles.count = count
            this.game.scene.add(particles)
        }

        // Hashes
        {
            const alphaNode = Fn(() =>
            {
                const baseUv = uv(1)
                const distanceToCenter = baseUv.sub(0.5).length()
    
                const voronoi = texture(
                    this.game.noises.voronoi,
                    baseUv
                ).g
    
                voronoi.subAssign(distanceToCenter.remap(0, 0.5, 0.3, 0))
    
                return voronoi
            })()
    
            const material = new MeshDefaultMaterial({
                colorNode: color(0x6F6A87),
                alphaNode: alphaNode,
                hasWater: false,
                hasLightBounce: false
            })
    
            const mesh = this.references.items.get('bonfireHashes')[0]
            mesh.material = material
        }

        // Burn
        const burn = this.references.items.get('bonfireBurn')[0]
        burn.visible = false

        // Interactive point
        this.game.interactivePoints.create(
            this.references.items.get('bonfireInteractivePoint')[0].position,
            'Res(e)t',
            InteractivePoints.ALIGN_RIGHT,
            InteractivePoints.STATE_CONCEALED,
            () =>
            {
                this.game.reset()

                gsap.delayedCall(2, () =>
                {
                    // Bonfire
                    particles.visible = true
                    burn.visible = true
                    this.game.ticker.wait(2, () =>
                    {
                        particles.geometry.boundingSphere.center.y = 2
                        particles.geometry.boundingSphere.radius = 2
                    })

                    // Sound
                    this.game.audio.groups.get('campfire').items[0].positions.push(position)
                })
            },
            () =>
            {
                this.game.inputs.interactiveButtons.addItems(['interact'])
            },
            () =>
            {
                this.game.inputs.interactiveButtons.removeItems(['interact'])
            },
            () =>
            {
                this.game.inputs.interactiveButtons.removeItems(['interact'])
            }
        )
    }

    setAchievement()
    {
        this.events.on('boundingIn', () =>
        {
            this.game.achievements.setProgress('areas', 'landing')
        })
        this.events.on('boundingOut', () =>
        {
            this.game.achievements.setProgress('landingLeave', 1)
        })
    }

    update()
    {
        this.localTime.value += this.game.ticker.deltaScaled * 0.1
    }
}