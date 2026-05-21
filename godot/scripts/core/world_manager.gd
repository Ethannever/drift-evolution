extends Node

## 世界管理器 - 管理海洋、洋流、物资生成

signal current_changed(new_current: Vector2)
signal item_spawned(item: Node2D)
signal item_collected(item_id: String, collector_id: String)

# 世界边界
@export var world_bounds: Rect2 = Rect2(-2000, -2000, 4000, 4000)

# 洋流
var current_direction: Vector2 = Vector2(1, 0)
var current_speed: float = 0.3
var current_timer: float = 0.0
const CURRENT_CHANGE_INTERVAL := 30.0

# 物资
var spawned_items: Array[Node2D] = []
var item_spawn_timer: float = 0.0
const ITEM_SPAWN_INTERVAL := 3.0  # 每3秒尝试生成
const MAX_ITEMS := 50
const ITEMS_PER_SPAWN := 3

# 玩家引用
var player: Vehicle

func _ready():
    randomize()
    _refresh_current()
    _spawn_initial_items()

func _process(delta: float):
    _update_current_timer(delta)
    _update_item_spawner(delta)
    _check_item_bounds()

func _update_current_timer(delta: float):
    current_timer += delta
    if current_timer >= CURRENT_CHANGE_INTERVAL:
        _refresh_current()
        current_timer = 0.0

func _refresh_current():
    # 随机方向（8个方向之一）
    var angle := randi() % 8 * PI / 4.0
    current_direction = Vector2.from_angle(angle)
    current_speed = randf_range(0.2, 0.5)
    current_changed.emit(current_direction * current_speed)

func get_ocean_current_at(pos: Vector2) -> Vector2:
    return current_direction * current_speed

func _update_item_spawner(delta: float):
    if spawned_items.size() >= MAX_ITEMS:
        return
    
    item_spawn_timer += delta
    if item_spawn_timer >= ITEM_SPAWN_INTERVAL:
        item_spawn_timer = 0.0
        for i: int in ITEMS_PER_SPAWN:
            if spawned_items.size() >= MAX_ITEMS:
                break
            _spawn_item()

func _spawn_initial_items():
    for i: int in 20:
        _spawn_item()

func _spawn_item():
    var item_node := _create_item_node()
    var pos := _get_valid_spawn_position()
    item_node.global_position = pos
    spawned_items.append(item_node)
    add_child(item_node)
    item_spawned.emit(item_node)

func _get_valid_spawn_position() -> Vector2:
    var attempts := 0
    var pos: Vector2
    while attempts < 20:
        pos = Vector2(
            randf_range(world_bounds.position.x, world_bounds.end.x),
            randf_range(world_bounds.position.y, world_bounds.end.y)
        )
        # 确保不生成在玩家附近
        if player and pos.distance_to(player.global_position) > 200:
            return pos
        attempts += 1
    return pos

func _create_item_node() -> Node2D:
    var item_data: ItemData = GameManager.create_random_item()
    
    var node := Node2D.new()
    node.set_script(load("res://scripts/vehicle/floating_item.gd"))
    node.item_data = item_data
    node.name = "Item_%s_%d" % [item_data.type, randi() % 10000]
    
    # 添加精灵
    var spr := Sprite2D.new()
    var colors := {
        ItemData.ItemType.WOOD: Color(139, 90, 43),
        ItemData.ItemType.METAL: Color(192, 192, 192),
        ItemData.ItemType.CLOTH: Color(100, 149, 237),
        ItemData.ItemType.ELECTRONIC: Color(0, 255, 127),
        ItemData.ItemType.FUEL: Color(255, 165, 0),
        ItemData.ItemType.RARE: Color(138, 43, 226),
        ItemData.ItemType.ARTIFACT: Color(255, 215, 0)
    }
    var col := colors.get(item_data.type, Color.WHITE)
    var rect := ColorRect.new()
    rect.size = Vector2(16, 16)
    rect.color = col
    rect.name = "Sprite"
    node.add_child(rect)
    
    # 标签显示品质
    var lbl := Label.new()
    lbl.text = item_data.item_name
    lbl.position = Vector2(-20, 20)
    lbl.add_theme_font_size_override("font_size", 10)
    lbl.add_theme_color_override("font_color", item_data.get_quality_color())
    node.add_child(lbl)
    
    # 设置碰撞
    var area := Area2D.new()
    area.name = "ItemArea"
    var col_shape := CollisionShape2D.new()
    var shape := CircleShape2D.new()
    shape.radius = 12.0
    col_shape.shape = shape
    area.add_child(col_shape)
    node.add_child(area)
    
    # 连接碰撞信号
    area.body_entered.connect(_on_item_body_entered.bind(node))
    
    return node

func _on_item_body_entered(body: Node2D, item_node: Node2D):
    if body is Vehicle and body == player:
        var item_data: ItemData = item_node.item_data
        body.collect_item(item_data)
        _remove_item(item_node)
        item_collected.emit(item_node.name, body.name)

func _remove_item(item_node: Node2D):
    if item_node in spawned_items:
        spawned_items.erase(item_node)
    item_node.queue_free()

func _check_item_bounds():
    for item: Node2D in spawned_items:
        if not world_bounds.has_point(item.global_position):
            _remove_item(item)

func get_world_bounds() -> Rect2:
    return world_bounds
