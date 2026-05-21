class_name VehicleData
extends Resource

@export var vehicle_name: String = "木筏"
@export var vehicle_id: String = "raft"
@export var max_hp: float = 50.0
@export var speed: float = 0.3
@export var acceleration: float = 0.1
@export var mass: float = 1.0
@export var capacity: int = 5
@export var sprite_frames: int = 4
@export var sprite_size: Vector2i = Vector2i(64, 64)
@export var weapon_slots: int = 0
@export var attachment_slots: int = 0
@export var can_fire: bool = false
@export var can_sail: bool = false
@export var evolution_stage: int = 0
@export var next_evolution: String = "canoe"

func get_actual_speed(attachments: Array) -> float:
    var bonus := 0.0
    for att in attachments:
        if att.attachment_type == "engine":
            bonus += att.speed_boost
    return speed * (1.0 + bonus)

func get_actual_max_hp(attachments: Array) -> float:
    var bonus := 0.0
    for att in attachments:
        if att.attachment_type == "armor":
            bonus += att.hp_boost
    return max_hp * (1.0 + bonus)
