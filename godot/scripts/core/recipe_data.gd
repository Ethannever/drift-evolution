class_name RecipeData
extends Resource

@export var result_vehicle_id: String = "canoe"
@export var result_display_name: String = "皮划艇"
@export var description: String = "用木板和绳索制作更稳固的载具"

@export var required_materials: Dictionary = {
    "WOOD": 20,
    "CLOTH": 5
}

@export var required_stage: int = 0  # 需要当前进化阶段
@export var sprite_frame_result: int = 1  # 进化后使用哪帧

func get_total_cost() -> int:
    # 返回所需材料总价值（用于UI排序）
    return required_materials.values().reduce(func(a, b): return a + b, 0)

func can_craft(inventory: Dictionary) -> bool:
    """检查材料是否足够"""
    for material_type: String in required_materials.keys():
        var needed: int = required_materials[material_type]
        var have: int = inventory.get(material_type, 0)
        if have < needed:
            return false
    return true

func get_missing_materials(inventory: Dictionary) -> Dictionary:
    """返回缺少的材料"""
    var missing := {}
    for material_type: String in required_materials.keys():
        var needed: int = required_materials[material_type]
        var have: int = inventory.get(material_type, 0)
        if have < needed:
            missing[material_type] = needed - have
    return missing
