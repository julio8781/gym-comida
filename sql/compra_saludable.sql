-- ============================================================
-- PASTANAGA · empezar la compra de cero con la lista saludable
-- ⚠ BORRA para siempre la lista y la despensa (son de los dos).
-- Luego mete la lista saludable de Mercadona como ⭐ básicos,
-- en el orden de los pasillos. Los caprichos se añaden desde la app.
-- ============================================================
delete from public.pastanaga_lista;
delete from public.pastanaga_despensa;

insert into public.pastanaga_lista (nombre, fijo) values
  -- Fruta y verdura
  ('Plátanos', true), ('Manzanas', true), ('Mandarinas', true),
  ('Tomates', true), ('Bolsa de ensalada', true), ('Pepino', true),
  ('Pimientos', true), ('Cebolla', true), ('Brócoli', true),
  ('Calabacín', true), ('Verduras congeladas para saltear', true),
  ('Patatas', true), ('Limones', true),
  -- Carne y pescado
  ('Pechuga de pollo', true), ('Carne picada de pollo o pavo', true),
  ('Lomo de cerdo', true), ('Salmón', true), ('Merluza congelada', true),
  ('Atún al natural (latas)', true), ('Huevos', true),
  ('Claras de huevo (brick)', true), ('Pechuga de pavo en lonchas', true),
  -- Lácteos
  ('Yogur griego natural o skyr', true), ('Queso fresco batido 0 %', true),
  ('Queso fresco de Burgos', true), ('Leche semidesnatada', true),
  -- Despensa
  ('Arroz', true), ('Pasta integral', true), ('Copos de avena', true),
  ('Pan de molde integral', true), ('Tortitas de arroz o maíz', true),
  ('Garbanzos cocidos', true), ('Lentejas cocidas', true),
  ('Tomate triturado', true), ('Aceite de oliva virgen extra', true),
  ('Frutos secos naturales', true), ('Crema de cacahuete 100 %', true),
  -- Bebida
  ('Refrescos zero', true), ('Agua con gas', true);
