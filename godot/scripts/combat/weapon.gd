# 武器组件 - v1.1
# 可附加到载具的武器

extends Node2D

class_name Weapon

signal fired(projectile: Node2D)
signal cooldown_ready

enum WeaponType {MELEE, RANGED, SPECIAL}
enum DamageType {PHYSICAL, EXPLOSIVE, ENERGY}

@export var weapon_name: String = "武器"
@export var weapon_type: WeaponType = WeaponType.MELEE
@export var damage: float = 10.0
@export var damage_type: DamageType = DamageType.PHYSICAL
@export var fire_rate: float = 1.0  # 每秒发射次数
@export var range: float = 200.0    # 射程
@export var projectile_speed: float = 300.0
@export var projectile_scene: PackedScene = null
@export var ammo_cost: int = 0
@export var knockback: float = 50.0

var _cooldown_timer: float = 0.0
var _owner: Node2D = null
var _current_ammo: int = -1  # -1 表示无限


func _ready():
	_cooldown_timer = 0.0


func _process(delta: float):
	if _cooldown_timer > 0:
		_cooldown_timer -= delta
		if _cooldown_timer <= 0:
			emit_signal("cooldown_ready")


func set_owner(owner: Node2D):
	_owner = owner


func can_fire() -> bool:
	if _cooldown_timer > 0:
		return false
	if ammo_cost > 0 and _current_ammo < ammo_cost:
		return false
	return true


func fire(target_pos: Vector2) -> bool:
	if not can_fire():
		return false
	
	# 消耗弹药
	if _current_ammo > 0:
		_current_ammo -= ammo_cost
	
	# 设置冷却
	_cooldown_timer = 1.0 / fire_rate
	
	# 根据武器类型执行
	match weapon_type:
		WeaponType.MELEE:
			return _fire_melee(target_pos)
		WeaponType.RANGED:
			return _fire_ranged(target_pos)
		WeaponType.SPECIAL:
			return _fire_special(target_pos)
	
	return false


func _fire_melee(target_pos: Vector2) -> bool:
	# 近战：直接对目标造成伤害
	if _owner and _owner.has_method("get_tree"):
		var space = _owner.get_world_2d()
		var query = PhysicsPointQueryParameters2D.new()
		query.position = _owner.global_position + (_owner.global_position.direction_to(target_pos) * 50)
		query.collide_with_bodies = true
		
		var results = space.intersect_point(query, 5)
		for result in results:
			var node = result.collider
			if node != _owner and node.has_method("take_damage"):
				var damage_result = node.take_damage(damage, _owner)
				if knockback > 0 and node.has_method("apply_knockback"):
					var dir = _owner.global_position.direction_to(node.global_position)
					node.apply_knockback(dir * knockback)
	
	return true


func _fire_ranged(target_pos: Vector2) -> bool:
	if not projectile_scene:
		return false
	
	var projectile = projectile_scene.instantiate()
	projectile.setup(_owner, damage, damage_type, projectile_speed, range, knockback)
	projectile.global_position = _owner.global_position
	projectile.look_at(target_pos)
	
	var world = _owner.get_tree().root.get_node("MainWorld")
	if world:
		world.add_child(projectile)
	
	emit_signal("fired", projectile)
	return true


func _fire_special(target_pos: Vector2) -> bool:
	# 特殊武器（子类实现）
	return false


func reload():
	# 重新装填（子类可重写）
	pass


func get_cooldown_percent() -> float:
	if fire_rate <= 0:
		return 1.0
	return clamp(1.0 - (_cooldown_timer * fire_rate), 0.0, 1.0)


func get_ammo_display() -> String:
	if _current_ammo < 0:
		return "∞"
	return str(_current_ammo)
