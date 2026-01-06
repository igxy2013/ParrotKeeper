import json
from app import create_app
from models import db, ParrotSpecies

def build_plumage_for_species(name: str):
    n = (name or '').strip()
    
    # --- 1. 玄凤鹦鹉 (Cockatiel) ---
    if '玄凤' in n or 'Cockatiel' in n:
        loci = {
            'whiteface': {'label': '白面', 'type': 'autosomal'},
            'lutino': {'label': '黄化', 'type': 'sex-linked'},
            'pearl': {'label': '珍珠', 'type': 'sex-linked'},
            'pied': {'label': '派特', 'type': 'autosomal'},
            'cinnamon': {'label': '肉桂', 'type': 'sex-linked'},
            'fallow': {'label': '华勒', 'type': 'autosomal'},
        }
        # 注意：autosomal 显性/隐性通常需要2份基因才显示(隐性)，或者1份(显性)。
        # 这里为了简化，recessive set to 2 for visual. 
        # Sex-linked: 1 for visual (in male 1,1; in female 1,-1). 
        # But buildGenotype handles sex-linked logic.
        colors = [
            {'name': '原始灰', 'genes': {}},
            {'name': '灰色', 'genes': {}}, # Alias for Wild Type
            {'name': '黄化', 'genes': {'lutino': 1}},
            {'name': '乳黄', 'genes': {'lutino': 1}}, # Alias
            {'name': '珍珠', 'genes': {'pearl': 1}},
            {'name': '派特', 'genes': {'pied': 2}},
            {'name': '白面', 'genes': {'whiteface': 2}},
            {'name': '白面珍珠', 'genes': {'whiteface': 2, 'pearl': 1}},
            {'name': '白面派特', 'genes': {'whiteface': 2, 'pied': 2}},
            {'name': '白面黄化', 'genes': {'whiteface': 2, 'lutino': 1}}, # Albino
            {'name': '白色', 'genes': {'whiteface': 2, 'lutino': 1}},     # Alias for Albino
            {'name': '珍珠派特', 'genes': {'pearl': 1, 'pied': 2}},
            {'name': '肉桂', 'genes': {'cinnamon': 1}},
            {'name': '古铜', 'genes': {'fallow': 2}},
        ]
        return {'colors': colors, 'loci': loci}

    # --- 2. 虎皮鹦鹉 (Budgerigar) ---
    elif '虎皮' in n or 'Budgerigar' in n:
        loci = {
            'blue': {'label': '蓝化', 'type': 'autosomal'}, # Recessive
            'lutino': {'label': '黄化', 'type': 'sex-linked'},
            'albino': {'label': '白化', 'type': 'autosomal'}, # In seed_plumage original, but actually Albino is Blue+Lutino usually.
            # Let's use components
            'opaline': {'label': '欧泊', 'type': 'sex-linked'},
            'cinnamon': {'label': '肉桂', 'type': 'sex-linked'},
            'pied': {'label': '派特', 'type': 'autosomal'},
            'spangle': {'label': '珍珠', 'type': 'autosomal', 'incomplete': True}, # 珍珠(显性)
            'yellowface': {'label': '黄脸', 'type': 'autosomal'},
            'grey': {'label': '灰基因', 'type': 'autosomal', 'incomplete': True}, # Dominant
            'violet': {'label': '紫罗兰', 'type': 'autosomal', 'incomplete': True},
        }
        colors = [
            {'name': '原始绿', 'genes': {}},
            {'name': '绿色', 'genes': {}},
            {'name': '蓝色', 'genes': {'blue': 2}},
            {'name': '黄化', 'genes': {'lutino': 1}},
            {'name': '白化', 'genes': {'blue': 2, 'lutino': 1}},
            {'name': '白色', 'genes': {'blue': 2, 'lutino': 1}},
            {'name': '黄色', 'genes': {'lutino': 1}}, # Green series Lutino
            {'name': '灰色', 'genes': {'grey': 1}}, # Green Grey
            {'name': '蓝灰', 'genes': {'blue': 2, 'grey': 1}},
            {'name': '紫罗兰', 'genes': {'blue': 2, 'violet': 1}},
            {'name': '彩虹', 'genes': {'blue': 2, 'opaline': 1, 'yellowface': 1, 'grey': 0}}, # Rainbow is complicated (Opaline Yellowface Blue/Greywing)
            {'name': '派特', 'genes': {'pied': 2}},
        ]
        return {'colors': colors, 'loci': loci}

    # --- 3. 和尚鹦鹉 (Monk/Quaker) ---
    elif '和尚' in n or 'Monk' in n or 'Quaker' in n:
        loci = {
            'blue': {'label': '蓝化', 'type': 'autosomal'},
            'ino': {'label': '黄化', 'type': 'sex-linked'},
            'pallid': {'label': '银丝', 'type': 'sex-linked'},
            'cinnamon': {'label': '肉桂', 'type': 'sex-linked'},
            'pied': {'label': '派特', 'type': 'autosomal'}, # Recessive pied usually
            'dark': {'label': '深色', 'type': 'autosomal', 'incomplete': True},
        }
        colors = [
            {'name': '绿和尚', 'genes': {}},
            {'name': '蓝和尚', 'genes': {'blue': 2}},
            {'name': '深绿和尚', 'genes': {'dark': 1}},
            {'name': '橄榄绿和尚', 'genes': {'dark': 2}},
            {'name': '钴蓝和尚', 'genes': {'blue': 2, 'dark': 1}},
            {'name': '紫罗兰和尚', 'genes': {'blue': 2, 'dark': 2}}, # Visual Violet in Blue
            {'name': '肉桂绿和尚', 'genes': {'cinnamon': 1}},
            {'name': '肉桂蓝和尚', 'genes': {'blue': 2, 'cinnamon': 1}},
            {'name': '银丝和尚', 'genes': {'pallid': 1}},
            {'name': '蓝银丝和尚', 'genes': {'blue': 2, 'pallid': 1}},
            {'name': '派特绿和尚', 'genes': {'pied': 2}},
            {'name': '派特蓝和尚', 'genes': {'blue': 2, 'pied': 2}},
        ]
        return {'colors': colors, 'loci': loci}

    # --- 4. 小太阳 (Green Cheek Conure) ---
    elif '小太阳' in n or 'Green Cheek' in n:
        loci = {
            'turquoise': {'label': '蓝化', 'type': 'autosomal'}, # Recessive
            'cinnamon': {'label': '肉桂', 'type': 'sex-linked'},
            'opaline': {'label': '黄边', 'type': 'sex-linked'}, # Opaline in GCC is Yellow-sided
            'dilute': {'label': '稀释', 'type': 'autosomal'}, # Recessive
            'pied': {'label': '派特', 'type': 'autosomal'}, # Recessive (Recessive Pied)
        }
        colors = [
            {'name': '绿颊小太阳（原始）', 'genes': {}},
            {'name': '黄边小太阳', 'genes': {'opaline': 1}},
            {'name': '肉桂小太阳', 'genes': {'cinnamon': 1}},
            {'name': '凤梨小太阳', 'genes': {'cinnamon': 1, 'opaline': 1}},
            {'name': '蓝化小太阳', 'genes': {'turquoise': 2}},
            {'name': '蓝化黄边', 'genes': {'turquoise': 2, 'opaline': 1}},
            {'name': '蓝化肉桂', 'genes': {'turquoise': 2, 'cinnamon': 1}},
            {'name': '蓝化凤梨', 'genes': {'turquoise': 2, 'cinnamon': 1, 'opaline': 1}},
            {'name': '香吉士(美国黄/稀释)', 'genes': {'dilute': 2}}, # American Dilute
            {'name': '月亮(Mint/蓝化稀释)', 'genes': {'turquoise': 2, 'dilute': 2}}, # Mint
            {'name': 'Suncheek(阳曦/凤梨稀释)', 'genes': {'dilute': 2, 'cinnamon': 1, 'opaline': 1}}, # Suncheek
            {'name': 'Mooncheek(月光/蓝化凤梨稀释)', 'genes': {'turquoise': 2, 'dilute': 2, 'cinnamon': 1, 'opaline': 1}}, # Mooncheek
            {'name': '派特小太阳', 'genes': {'pied': 2}},
        ]
        return {'colors': colors, 'loci': loci}

    # --- 5. 牡丹鹦鹉 (Lovebird) ---
    elif '牡丹' in n or '爱情鸟' in n or 'Lovebird' in n:
        loci = {
            'blue': {'label': '蓝化', 'type': 'autosomal'}, # Recessive (Whiteface)
            'ino': {'label': '黄化', 'type': 'sex-linked'},
            'cinnamon': {'label': '肉桂', 'type': 'sex-linked'},
            'opaline': {'label': '欧泊', 'type': 'sex-linked'}, # Rose-faced Opaline
            'pied': {'label': '派特', 'type': 'autosomal'}, # Dominant Pied often? JS says pied_dom. Let's assume Recessive for simplicity or check JS. JS checks `pied_dom` or `pied`.
            'white_face': {'label': '白面', 'type': 'autosomal'}, # Often same as Blue in some context, but JS separates.
            'dark': {'label': '深色', 'type': 'autosomal', 'incomplete': True},
            'violet': {'label': '紫罗兰', 'type': 'autosomal', 'incomplete': True},
            'orange_face': {'label': '橙面', 'type': 'autosomal'},
        }
        colors = [
            {'name': '野生型（绿桃）', 'genes': {}},
            {'name': '黄桃（黄化）', 'genes': {'ino': 1}}, # Lutino
            {'name': '蓝银顶', 'genes': {'blue': 2}}, # Dutch Blue
            {'name': '绿金顶', 'genes': {'blue': 1}}, # Split Blue? No, Parblue? Or Orange Face? JS says if splitBlue -> 绿金顶. 
            # In JS: if (isBlue) color = '蓝银顶'; else if (isSplitBlue) color = '绿金顶'.
            # So 绿金顶 is actually split blue (Blue/Green)? No, usually Split doesn't change color.
            # Maybe it refers to Aqua (Parblue)?
            # Let's just set 绿金顶 to some gene configuration if needed. 
            # JS logic: if (isSplitBlue) return '绿金顶'.
            # To make a visual '绿金顶', we might need to simulate it. But 'Split' is usually hidden.
            # However, in some contexts, "Green Split Blue" is just Green. 
            # "绿金顶" might be Orange Face?
            {'name': '白桃（白化）', 'genes': {'blue': 2, 'ino': 1}}, # Albino
            {'name': '白面桃', 'genes': {'white_face': 2}},
            {'name': '紫罗兰', 'genes': {'blue': 2, 'violet': 1}},
            {'name': '墨蓝', 'genes': {'blue': 2, 'dark': 2}},
            {'name': '钴蓝', 'genes': {'blue': 2, 'dark': 1}},
            {'name': '深绿', 'genes': {'dark': 1}},
            {'name': '橄榄绿', 'genes': {'dark': 2}},
            {'name': '肉桂桃', 'genes': {'cinnamon': 1}},
            {'name': '派特桃', 'genes': {'pied': 2}},
        ]
        return {'colors': colors, 'loci': loci}

    else:
        # Default fallback
        base_colors = [{'name': '绿色', 'genes': {}}, {'name': '蓝色', 'genes': {'blue': 2}}, {'name': '黄色', 'genes': {'lutino': 1}}]
        base_loci = {
             'blue': {'label': '蓝化', 'type': 'autosomal'},
             'lutino': {'label': '黄化', 'type': 'sex-linked'}
        }
        return {'colors': base_colors, 'loci': base_loci}

def merge_plumage(existing_json: str, new_data: dict):
    try:
        cur = {}
        if existing_json:
            cur = json.loads(existing_json)
        
        # Merge Colors: Overwrite existing colors with same name to update genes
        cur_colors = cur.get('colors') or []
        # Create a map of existing colors
        color_map = {c.get('name'): c for c in cur_colors if isinstance(c, dict)}
        
        # 清理已废弃/更名的颜色
        deprecated_colors = ['绿肉桂和尚']
        # 小太阳鹦鹉废弃的颜色名称（简写或错误名称）
        deprecated_sun_conure_colors = [
            '绿颊', '原始', '肉桂', '黄边', '凤梨', '蓝化', 
            '香吉士', '月亮', '阳曦', '月光',
            '金太阳'  # 错误名称
        ]
        deprecated_colors.extend(deprecated_sun_conure_colors)
        # 和尚鹦鹉重复/别名
        deprecated_monk_colors = ['绿色', '蓝色']
        deprecated_colors.extend(deprecated_monk_colors)
        # 牡丹鹦鹉重复/别名
        deprecated_lovebird_colors = ['绿桃', '野生型', '白桃', '黄桃', '白面绿桃', '派特', '白色', '黄色']
        deprecated_colors.extend(deprecated_lovebird_colors)
        for d in deprecated_colors:
            if d in color_map:
                del color_map[d]
        
        for new_c in new_data.get('colors', []):
            name = new_c.get('name')
            if name:
                # Always update/overwrite with new definition
                color_map[name] = new_c
        
        # Convert back to list
        cur['colors'] = list(color_map.values())

        # Merge Loci
        cur_loci = cur.get('loci') or {}
        for key, val in (new_data.get('loci') or {}).items():
            # Update or add loci
            cur_loci[key] = val
        cur['loci'] = cur_loci
        
        return json.dumps(cur, ensure_ascii=False)
    except Exception as e:
        print(f"Error merging plumage: {e}")
        return json.dumps(new_data, ensure_ascii=False)


def main():
    app = create_app()
    with app.app_context():
        updated = 0
        species_list = ParrotSpecies.query.all()
        for s in species_list:
            new_data = build_plumage_for_species(s.name)
            s.plumage_json = merge_plumage(s.plumage_json, new_data)
            updated += 1
        db.session.commit()
        print(f'已补充/更新 {updated} 个品种的羽色数据')

if __name__ == '__main__':
    main()
