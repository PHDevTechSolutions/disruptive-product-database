-- Remove SPF-DSI-26-0239-002-A from spf_creation table
-- This removes the FIRST item from row 2 (before the comma)
-- Run this in your SQL editor (Supabase/PostgreSQL)

UPDATE spf_creation
SET 
  -- item_code: SPF-DSI-26-0239-001|ROW|SPF-DSI-26-0239-002-A,SPF-DSI-26-0239-002-B
  -- After: SPF-DSI-26-0239-001|ROW|SPF-DSI-26-0239-002 (renamed from -002-B)
  item_code = 'SPF-DSI-26-0239-001|ROW|SPF-DSI-26-0239-002',
  
  -- product_offer_image: Remove first image from row 2
  product_offer_image = 'https://res.cloudinary.com/dhczsyzcz/image/upload/v1778577213/products/ep3t038xe4mkk2gya8lsuwj6h.png|ROW|https://res.cloudinary.com/dhczsyzcz/image/upload/v1779086861/products/wytznmlq7uv3hmjav6a1whzx8.png',
  
  -- product_offer_qty: Remove first qty from row 2
  product_offer_qty = '22|ROW|22',
  
  -- product_offer_technical_specification: Remove first spec from row 2
  product_offer_technical_specification = 'LED DETAILS~~Wattage: 100W;;Lumen Output: 18000 lm;;CCT: 3000 K;;CRI: Ra70;;Life Hours: 100000 Hrs;;Beam Angle: III-M@@SOLAR PANEL AND BATTERY DETAILS~~Power: 120 W;;Voltage: 36 V;;Material: Monocrystalline;;Battery Capacity: 25.6V 24Ah;;Battery Type: LiFePO4;;Charging Time: 6 Hrs;;Working time: 2H - 100% 3H - 50% 6H - 20% 1H - 30%;;Working temp: 20℃ to 65℃@@FIXTURE DETAILS~~Material: Aluminul die-cast housing, PC UV-resistant optical lens;;IP Rating: IP66;;Mounting Height: 8-9 m|ROW|POLE SPECIFICATIONS~~Pole Type: Bracket Type;;Height (M): 9 m;;Top Diameter ( mm): 75 mm;;Bottom Diameter ( mm): 200 mm;;Thickness ( mm): 4.5 mm;;Hand Hole: Incldued;;Coating: HDG@@ARM DETAILS~~Arm Type: Single Arm Bracket Type;;Arm Length ( mm): 1500 mm@@BASE PLATE DETAILS~~Size ( mm): 350 x 350 mm;;Base Plate Thickness ( mm): 19 mm;;Stiffener Plate Thickness ( mm): 12 mm x 250 mm@@ANCHOR BOLT DETAILS~~Bolt Diameter ( mm): 19 mm;;Overall Length ( mm): 762 mm;;Type: L-Type;;Accessories: Nut and Flat Washers',
  
  -- product_offer_unit_cost: Remove first cost from row 2
  product_offer_unit_cost = '249.9|ROW|43500',
  
  -- product_offer_packaging_details: Remove first packaging from row 2
  product_offer_packaging_details = '170 cm x 45 cm x 33 cm|ROW|-',
  
  -- product_offer_factory_address: Remove first address from row 2
  product_offer_factory_address = '-|ROW|-',
  
  -- product_offer_port_of_discharge: Remove first port from row 2
  product_offer_port_of_discharge = '-|ROW|-',
  
  -- product_offer_subtotal: Remove first subtotal from row 2
  product_offer_subtotal = '5497.8|ROW|957000',
  
  -- final_selling_cost: Remove first selling cost from row 2
  final_selling_cost = '53450.00|ROW|55400',
  
  -- proj_lead_time: Remove first lead time from row 2
  proj_lead_time = '60 DAYS|ROW|40 DAYS',
  
  -- final_unit_cost: Remove first unit cost from row 2
  final_unit_cost = '249.9|ROW|43500',
  
  -- final_subtotal: Remove first subtotal from row 2
  final_subtotal = '337619.34822|ROW|59004792',
  
  -- product_offer_pcs_per_carton: Remove first value from row 2
  product_offer_pcs_per_carton = '1|ROW|-',
  
  -- price_validity: Remove first validity from row 2
  price_validity = '2026-06-12T18:19:00.000Z|ROW|2026-05-30T14:52:00.000Z',
  
  -- dimensional_drawing: Remove first drawing from row 2
  dimensional_drawing = '-|ROW|-',
  
  -- illuminance_drawing: Remove first drawing from row 2
  illuminance_drawing = '-|ROW|-',
  
  -- original_technical_specification: Remove first original spec from row 2
  original_technical_specification = 'LED DETAILS~~Wattage: 100W;;Lumen Output: 18000 lm;;CCT: 3000 K;;CRI: Ra70;;Life Hours: 100000 Hrs;;Beam Angle: II-S | II-M | III-M@@SOLAR PANEL AND BATTERY DETAILS~~Power: 120 W;;Voltage: 36 V;;Material: Monocrystalline;;Battery Capacity: 25.6V 24Ah;;Battery Type: LiFePO4;;Charging Time: 6 Hrs;;Working time: 2H - 100% 3H - 50% 6H - 20% 1H - 30%;;Working temp: 20℃ to 65℃@@FIXTURE DETAILS~~Material: Aluminul die-cast housing, PC UV-resistant optical lens;;IP Rating: IP66;;Mounting Height: 8-9 m|ROW|POLE SPECIFICATIONS~~Pole Type: Bracket Type;;Height (M): 9 m;;Top Diameter ( mm): 75 mm;;Bottom Diameter ( mm): 200 mm;;Thickness ( mm): 4.5 mm;;Hand Hole: Incldued;;Coating: HDG@@ARM DETAILS~~Arm Type: Single Arm Bracket Type;;Arm Length ( mm): 1500 mm@@BASE PLATE DETAILS~~Size ( mm): 350 x 350 mm;;Base Plate Thickness ( mm): 19 mm;;Stiffener Plate Thickness ( mm): 12 mm x 250 mm@@ANCHOR BOLT DETAILS~~Bolt Diameter ( mm): 19 mm;;Overall Length ( mm): 762 mm;;Type: L-Type;;Accessories: Nut and Flat Washers',
  
  -- product_reference_id: Remove first ref ID from row 2
  product_reference_id = 'PROD-SPF-01158|ROW|PROD-SPF-01161',
  
  -- supplier_branch: Remove first branch from row 2
  supplier_branch = '-|ROW|-',
  
  -- spf_remarks_pd: Remove first remark from row 2
  spf_remarks_pd = '-|ROW|-',
  
  -- supplier_brand: Remove first brand from row 2
  supplier_brand = 'XEROLED|ROW|PHLMPOST',
  
  -- company_name: Remove first company from row 2
  company_name = '-|ROW|Philippine Lamp Post',
  
  -- contact_name: Remove first contact from row 2
  contact_name = '-|ROW|-',
  
  -- contact_number: Remove first number from row 2
  contact_number = '-|ROW|-',
  
  -- commercial_type: Remove first type from row 2
  commercial_type = 'BASIC|ROW|POLE',
  
  -- warranty: Remove first warranty from row 2
  warranty = '6 years|ROW|-',
  
  -- Update timestamp
  date_updated = NOW()
WHERE spf_number = 'SPF-DSI-26-0239';
