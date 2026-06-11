import * as THREE from 'three/webgpu'
import { mul, color } from 'three/tsl'
import gsap from 'gsap'
import { Game } from '../Game.js'
import { InstancedGroup } from '../InstancedGroup.js'

export class ExplosiveCrates
{
    constructor()
    {
        this.game = Game.getInstance()

        // Base and references
        const [ base, references ] = InstancedGroup.getBaseAndReferencesFromInstances(this.game.resources.explosiveCratesModel.scene.children)
        this.references = references
        
        // Setup base
        base.castShadow = true
        base.receiveShadow = true

        // Update materials 
        this.game.materials.updateObject(base)

        // Tint red
        base.traverse((child) => {
            if (child.isMesh && child.material) {
                if (child.material.colorNode) {
                    child.material.colorNode = mul(child.material.colorNode, color('#ff4444'))
                } else {
                    child.material.colorNode = color('#ff4444')
                }
                child.material.needsUpdate = true
            }
        })

        // Create instanced group
        this.instancedGroup = new InstancedGroup(this.references, base)

        this.items = []
        
        let i = 0
        for(const reference of this.references)
        {
            const crate = {}
            crate.id = i
            crate.exploded = false
            crate.reference = reference.clone()
            crate.object = this.game.objects.add(
                {
                    model: reference,
                },
                {
                    type: 'dynamic',
                    position: reference.position.clone(),
                    rotation: reference.quaternion.clone(),
                    friction: 0.7,
                    mass: 0.02,
                    sleeping: true,
                    colliders: [ { shape: 'cuboid', parameters: [ 0.5, 0.5, 0.5 ], category: 'object' } ],
                    waterGravityMultiplier: - 1,
                    contactThreshold: 0,
                    onCollision: () =>
                    {
                        this.explode(crate)
                    }
                },
            )

            this.items.push(crate)

            i++
        }

        this.setSounds()

        // Tick update
        this.game.ticker.events.on('tick', () =>
        {
            for(const crate of this.items)
            {
                if(!crate.object.physical.body.isSleeping() && crate.object.physical.body.isEnabled())
                    crate.object.visual.object3D.needsUpdate = true
            }
        }, 10)
    }

    setSounds()
    {
        this.sounds = {}

        // Click sound
        this.sounds.triggerClick = this.game.audio.register({
            path: 'sounds/clicks/Source Metal Clicks Delicate Light Sharp Clip Mid 07.mp3',
            autoplay: false,
            loop: false,
            volume: 0.4,
            antiSpam: 0.1,
            positions: new THREE.Vector3(),
            onPlay: (item, coordinates) =>
            {
                item.positions[0].copy(coordinates)
                item.volume = 1
                item.rate = 0.7 + Math.random() * 1.3
            }
        })

        const paths = [
            'sounds/explosions/SmallImpactMediumE PE281202.mp3',
            'sounds/explosions/SmallImpactMediumE PE281203.mp3'
        ]

        this.sounds.explosions = []

        for(const path of paths)
        {
            this.sounds.explosions.push(
                this.game.audio.register({
                    path: path,
                    autoplay: false,
                    loop: false,
                    volume: 0.4,
                    antiSpam: 0.2,
                    positions: new THREE.Vector3(),
                    distanceFade: 25,
                    onPlay: (item, coordinates) =>
                    {
                        item.positions[0].copy(coordinates)
                        item.volume = 1
                        item.rate = 0.9 + Math.random() * 0.3
                    }
                })
            )
        }
    }

    addDynamicCrate(position, quaternion)
    {
        const mesh = new THREE.Group()
        
        this.instancedGroup.group.traverse((_child) =>
        {
            if(_child.isMesh)
            {
                const instancedMesh = new THREE.InstancedMesh(_child.geometry, _child.material, 1)
                instancedMesh.castShadow = _child.castShadow
                instancedMesh.receiveShadow = _child.receiveShadow
                
                const matrix = new THREE.Matrix4()
                matrix.compose(_child.position, _child.quaternion, _child.scale)
                instancedMesh.setMatrixAt(0, matrix)
                instancedMesh.instanceMatrix.needsUpdate = true

                mesh.add(instancedMesh)
            }
        })

        mesh.position.copy(position)
        if(quaternion) mesh.quaternion.copy(quaternion)
        
        const crate = {}
        crate.id = this.items.length
        crate.exploded = false
        crate.reference = mesh
        crate.object = this.game.objects.add(
            {
                model: mesh,
            },
            {
                type: 'dynamic',
                position: mesh.position.clone(),
                rotation: mesh.quaternion.clone(),
                friction: 0.7,
                mass: 0.02,
                sleeping: true,
                colliders: [ { shape: 'cuboid', parameters: [ 0.5, 0.5, 0.5 ], category: 'object' } ],
                waterGravityMultiplier: - 1,
                contactThreshold: 0,
                onCollision: () =>
                {
                    this.explode(crate)
                }
            },
        )
        
        this.items.push(crate)
    }

    explode(crate)
    {
        if(crate.exploded)
            return

        crate.exploded = true

        this.sounds.triggerClick.play(crate.reference.position)

        gsap.delayedCall(0.4, () =>
        {
            // Sound
            this.sounds.explosions[Math.floor(Math.random() * this.sounds.explosions.length)].play(crate.reference.position)

            // Explode
            this.game.world.fireballs.create(crate.object.physical.body.translation())

            // Disable
            this.game.objects.disable(crate.object)
            crate.object.visual.object3D.position.y += 100 // Hide the instance reference
            crate.object.visual.object3D.needsUpdate = true

            // Achievements
            this.game.achievements.setProgress('explosiveCrates', crate.id)
        })
    }

    reset()
    {
        for(const crate of this.items)
        {
            this.game.objects.resetObject(crate.object)
            crate.exploded = false

            this.game.ticker.wait(2, () =>
            {
                crate.object.physical.body.setEnabled(true)
            })
        }
        
        this.instancedGroup.needsUpdate = true

        // Disable every other object to prevent explosion trigger
        this.game.objects.list.forEach((object) =>
        {
            // console.log(this.game.objects)
            if(
                object.physical &&
                (object.physical.type === 'dynamic' || object.physical.type === 'kinematicPositionBased') &&
                object.physical.body.isEnabled()
            )
            {
                object.physical.body.setEnabled(false)

                // Wait a second and reactivate
                this.game.ticker.wait(1, () =>
                {
                    object.physical.body.setEnabled(true)

                    // Sleep
                    if(object.physical.initialState.sleeping)
                        object.physical.body.sleep()

                })
            }
        })
    }
}