extends Node2D

## 漂流物资节点

var item_data: ItemData
var float_offset: float = 0.0
var float_speed: float = 2.0
var base_y: float = 0.0

func _ready():
    base_y = position.y
    add_to_group("floating_items")

func _process(delta: float):
    float_offset += delta * float_speed
    position.y = base_y + sin(float_offset * PI) * 4.0
    rotation += delta * 0.5

func get_item_data() -> ItemData:
    return item_data
