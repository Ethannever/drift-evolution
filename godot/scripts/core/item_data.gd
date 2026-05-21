class_name ItemData
extends Resource

enum ItemType { WOOD, METAL, CLOTH, ELECTRONIC, FUEL, RARE, ARTIFACT }
enum Quality { COMMON, UNCOMMON, RARE, EPIC, LEGENDARY }

@export var item_name: String = "木材"
@export var type: ItemType = ItemType.WOOD
@export var quality: Quality = Quality.COMMON
@export var value: int = 1
@export var icon: Texture2D
@export var stack_size: int = 99

const QUALITY_MULTIPLIERS := {
    Quality.COMMON: 1.0,
    Quality.UNCOMMON: 1.5,
    Quality.RARE: 3.0,
    Quality.EPIC: 5.0,
    Quality.LEGENDARY: 10.0
}

const QUALITY_COLORS := {
    Quality.COMMON: Color.WHITE,
    Quality.UNCOMMON: Color.GREEN,
    Quality.RARE: Color("4080FF"),
    Quality.EPIC: Color("AA40FF"),
    Quality.LEGENDARY: Color("FFD700")
}

const TYPE_NAMES := {
    ItemType.WOOD: "木材",
    ItemType.METAL: "金属",
    ItemType.CLOTH: "布料",
    ItemType.ELECTRONIC: "电子",
    ItemType.FUEL: "燃料",
    ItemType.RARE: "稀有",
    ItemType.ARTIFACT: "文物"
}

func get_actual_value() -> int:
    return int(value * QUALITY_MULTIPLIERS[quality])

func get_display_name() -> String:
    var q_name := ["普通", "优秀", "稀有", "史诗", "传说"][quality]
    return "[%s]%s" % [q_name, item_name]
