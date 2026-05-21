# 抛射物 - v1.1
# 子弹、炮弹、鱼雷等

extends Area2D

class_name Projectile

signal hit_target(target: Node2D, damage: float)
signal lifetime_expired

var _owner: Node2D = null
var _damage: float = 10.0
var _damage_type: int = 0
var _speed: float = 300.0
var _max_range: float = 500.0
var _knockback: float = 50.0
var _traveled_distance: float = 0.0
var _direction: Vector2 = Vector2.RIGHT

var _lifetime: float = 5.0  # 最大存活时间


func _ready():
	area_entered.connect(_on_area_entered)
	add_to_group("projectiles")


func setup(owner: Node2D, damage: float, damage_type: int, speed: float, max_range: float, knockback: float):
	_owner = owner
	_damage = damage
	_damage_type = damage_type
	_speed = speed
	_max_range = max_range
	_knockback = knockback
	_direction = transform.x
	
	# 设置碰撞层
	if owner and owner.is_in_group("vehicles"):
		# 玩家的炮弹不伤害玩家
		collision_mask = 2  # 只与 group 2 碰撞（敌人）
	
	_lifetime = max_range / speed * 2  # 保守估计


func _physics_process(delta: float):
	position += _direction * _speed * delta
	_traveled_distance += _speed * delta
	_lifetime -= delta
	
	if _lifetime <= 0 or _traveled_distance > _max_range:
		emit_signal("lifetime_expired")
		queue_free()


func _on_area_entered(area: Area2D):
	# 忽略发射者
	if area == _owner or (area.get_parent() == _owner):
		return
	
	# 忽略其他抛射物
	if area is Projectile:
		return
	
	# 对目标造成伤害
	if area.has_method("take_damage"):
		var damage_dealt = area.take_damage(_damage, _owner)
		emit_signal("hit_target", area, damage_dealt)
		
		# 应用击退
		if _knockback > 0 and area.has_method("apply_knockback"):
			area.apply_knockback(_direction * _knockback)
	
	queue_free()


func set_direction(dir: Vector2):
	_direction = dir
	if _direction.x < 0:
		scale.x = -1
