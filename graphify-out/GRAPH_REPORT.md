# Graph Report - .  (2026-07-29)

## Corpus Check
- Large corpus: 67 files · ~762,251 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 480 nodes · 908 edges · 29 communities (28 shown, 1 thin omitted)
- Extraction: 75% EXTRACTED · 24% INFERRED · 1% AMBIGUOUS · INFERRED: 217 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Core Runtime And Scene Hooks
- Chapter Narrative And Design Decisions
- WebGL World And Shaders
- Package Manifest And Dependencies
- Production Build Script
- Ambience Audio Engine
- Atrium Backdrop Plate
- Break Room Backdrop Plate
- Text Splitting Engine
- Egress Stairwell Plate
- Office Floor Backdrop Plate
- Elevator Cabin Plate
- Photographic Plate Loader
- MDR Refiner Canvas
- Corridor Backdrop Plate
- Helly Badge Portrait
- Mark Badge Portrait
- Smoke Test Harness
- Dylan Badge Portrait
- Irving Badge Portrait
- Image Asset Pipeline
- Mobile Viewport Checker
- Kier Founder Portrait
- Card Layout Probe
- Screenshot Frame Capture
- Element Position Probe
- Doctrine And Dossier Content
- Syntax Check Script
- Static Dev Server

## God Nodes (most connected - your core abstractions)
1. `qs()` - 29 edges
2. `qsa()` - 29 edges
3. `boot()` - 26 edges
4. `clamp()` - 24 edges
5. `initMacrodata()` - 15 edges
6. `World` - 14 edges
7. `Ambience` - 13 edges
8. `audio` - 13 edges
9. `MdrScreen` - 13 edges
10. `initPlates()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `Fixed Instrument Panel HUD` --shares_data_with--> `initHud()`  [INFERRED]
  index.html → js/core/hud.js
- `data-cursor and data-magnet Pointer Hooks` --shares_data_with--> `initPointer()`  [INFERRED]
  index.html → js/core/pointer.js
- `Lumon Boot Terminal Preloader` --shares_data_with--> `runPreloader()`  [INFERRED]
  index.html → js/core/preloader.js
- `Scene 06 Compliance (break room)` --shares_data_with--> `initBreakroom()`  [INFERRED]
  index.html → js/scenes/breakroom.js
- `Compliance Statement Lines` --shares_data_with--> `initBreakroom()`  [INFERRED]
  index.html → js/scenes/breakroom.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Three ideas that hold the site together** — readme_palette_machine, readme_one_raf_loop, readme_transform_single_owner [EXTRACTED 1.00]
- **The eight-chapter descent narrative** — readme_chapter_00_induction, readme_chapter_01_the_descent, readme_chapter_02_the_floor, readme_chapter_03_macrodata_refinement, readme_chapter_04_personnel, readme_chapter_05_doctrine, readme_chapter_06_the_break_room, readme_chapter_07_egress [EXTRACTED 1.00]
- **Build-to-deploy confidence pipeline** — readme_production_build, readme_verify_dist, readme_verification_suite, readme_window_severance_debug_handle, readme_vendored_libraries [INFERRED 0.85]
- **Boot-to-Shift Handoff Flow** — index_boot, index_enter, index_atrium_preload, index_module_entry, index_hud [INFERRED 0.85]
- **Declarative Data-Attribute Behaviour Contract** — index_data_split, index_data_reveal, index_data_palette, index_data_cursor, index_plate_figures [INFERRED 0.85]
- **Eight-Chapter Scene Sequence** — index_scene_hero, index_scene_descent, index_scene_corridor, index_scene_macrodata, index_scene_personnel, index_scene_handbook, index_scene_breakroom, index_scene_outro, index_rail [EXTRACTED 1.00]
- **Atrium Backdrop Responsive Asset Set** — img_src_atrium_atrium_lobby_artwork, img_atrium_1536_responsive_variant, img_atrium_960_responsive_variant, img_atrium_1536_responsive_image_pipeline [EXTRACTED 1.00]
- **Cold Institutional Visual Language Of The Atrium** — img_src_atrium_brutalist_concrete_architecture, img_src_atrium_linear_cove_lighting, img_src_atrium_polished_reflective_floor, img_src_atrium_cold_desaturated_palette, img_src_atrium_symmetrical_one_point_perspective, img_src_atrium_depopulated_corporate_space [INFERRED 0.85]
- **Dylan Badge Source PNG and Generated WebP Size Variants** — img_src_badge_dylan_badge_portrait, img_badge_dylan_1024_responsive_variant, img_badge_dylan_640_responsive_variant, img_badge_dylan_640_responsive_webp_delivery [INFERRED 0.95]
- **Anonymous Personnel Portrait Aesthetic (Silhouette, Rim Light, Sepia Grain)** — img_src_badge_dylan_silhouetted_profile_subject, img_src_badge_dylan_backlit_rim_lighting, img_src_badge_dylan_sepia_vignette_grain, img_src_badge_dylan_anonymized_identity, img_src_badge_dylan_employee_badge_asset_role [INFERRED 0.85]
- **Identity Effacement in the Badge Portrait** — img_src_badge_helly_source_portrait, img_src_badge_helly_obscured_identity, img_src_badge_helly_motion_blurred_head_turn, img_src_badge_helly_analog_film_grain_treatment [INFERRED 0.85]
- **Badge Helly Source and Generated Responsive Derivatives** — img_src_badge_helly_source_portrait, img_badge_helly_1024_responsive_variant, img_badge_helly_640_responsive_variant, img_badge_helly_640_responsive_webp_size_ladder [INFERRED 0.85]
- **Institutional Personnel Framing of the Subject** — img_src_badge_helly_employee_badge_asset, img_src_badge_helly_helly_persona, img_src_badge_helly_corporate_white_blouse, img_src_badge_helly_grey_studio_backdrop [INFERRED 0.75]
- **badge-irving Responsive Asset Family (PNG master plus WebP variants)** — img_src_badge_irving_source_master_asset, img_badge_irving_1024_responsive_variant, img_badge_irving_640_responsive_variant, img_badge_irving_640_responsive_webp_delivery_pipeline [INFERRED 0.85]
- **Badge Portrait Visual Language: Silhouette, Anonymity, Corporate Era** — img_src_badge_irving_silhouetted_profile_portrait, img_src_badge_irving_obscured_identity_motif, img_src_badge_irving_midcentury_corporate_aesthetic, img_src_badge_irving_employee_badge_personnel_portrait [INFERRED 0.75]
- **Badge Mark Responsive Delivery Set (Source PNG plus 1024 and 640 WebP)** — img_src_badge_mark_badge_portrait_photograph, img_badge_mark_1024_webp_variant, img_badge_mark_640_webp_variant, img_badge_mark_1024_responsive_asset_pipeline [INFERRED 0.85]
- **Depersonalized Corporate Personnel Portrait Aesthetic** — img_src_badge_mark_anonymous_rear_view_composition, img_src_badge_mark_corporate_dress_code_wardrobe, img_src_badge_mark_institutional_green_backdrop, img_src_badge_mark_analog_film_treatment, img_src_badge_mark_employee_badge_identity_asset [INFERRED 0.85]
- **Breakroom Backdrop Responsive Asset Set** — img_src_breakroom_breakroom_scene_backdrop, img_breakroom_1536_responsive_variant_1536w, img_breakroom_960_responsive_variant_960w, img_breakroom_1536_responsive_image_pipeline [INFERRED 0.95]
- **Breakroom Scene Staging Elements** — img_src_breakroom_single_pendant_lamp, img_src_breakroom_table_with_two_facing_chairs, img_src_breakroom_refrigerator_in_shadow, img_src_breakroom_kitchen_counter_and_cabinetry, img_src_breakroom_grid_tiled_floor [EXTRACTED 1.00]
- **Breakroom Dread Atmosphere Pattern** — img_src_breakroom_chiaroscuro_pool_of_light_staging, img_src_breakroom_isolation_and_interrogation_mood, img_src_breakroom_severance_break_room_motif, img_src_breakroom_dim_windowless_breakroom_interior [INFERRED 0.85]
- **Elements Producing the Endless-Depth Illusion** — img_src_corridor_one_point_perspective_vanishing_point, img_src_corridor_recessed_ceiling_light_panels, img_src_corridor_identical_flush_doors, img_src_corridor_reflective_polished_floor [INFERRED 0.85]
- **Corridor Plate Source and Generated Responsive Variants** — img_src_corridor_corridor_plate, img_corridor_1536_responsive_variant, img_corridor_960_responsive_variant, img_corridor_1536_responsive_delivery_ladder [INFERRED 0.85]
- **Egress Responsive Image Set (Source PNG Plus Generated WebP Variants)** — img_src_egress_source_plate, img_egress_1536_responsive_variant, img_egress_960_responsive_variant [EXTRACTED 1.00]
- **Dread-Laden Egress Composition: Lit Doors, Dark Stairwell, Guiding Rail** — img_src_egress_closed_elevator_doors, img_src_egress_caged_bulkhead_lamp, img_src_egress_bare_concrete_stairwell, img_src_egress_metal_handrail, img_src_egress_ascending_steps_and_landing, img_src_egress_low_key_chiaroscuro_lighting [INFERRED 0.85]
- **Symmetrical Office Floor Scene Composition** — img_src_floor_four_desk_symmetry, img_src_floor_retro_crt_workstation, img_src_floor_fluorescent_drop_ceiling, img_src_floor_central_potted_plant, img_src_floor_letterboxed_cinematic_framing [INFERRED 0.85]
- **Floor Backdrop Responsive Asset Set** — img_src_floor_office_floor_artwork, img_floor_1536_responsive_variant, img_floor_960_responsive_variant, img_floor_960_responsive_delivery_pipeline [INFERRED 0.90]
- **Kier Portrait Master Plus Generated Responsive Variants** — img_src_kier_portrait, img_kier_1024_variant, img_kier_640_variant [INFERRED 0.95]
- **Industrialist Founder Hagiography Composition** — img_src_kier_victorian_patriarch_subject, img_src_kier_industrial_cityscape_backdrop, img_src_kier_academic_oil_portrait_style, img_src_kier_founder_iconography [INFERRED 0.85]
- **Lift Car Backdrop Composition Elements** — img_src_lift_closed_steel_doors, img_src_lift_ceiling_dome_light, img_src_lift_dark_panelled_walls, img_src_lift_floor_indicator_panel, img_src_lift_low_key_lighting, img_src_lift_one_point_symmetrical_framing, img_src_lift_descent_scene_backdrop [INFERRED 0.85]
- **Lift Plate Responsive Asset Set** — img_src_lift_elevator_car_interior, img_lift_1536_responsive_variant, img_lift_960_responsive_variant, img_lift_1536_responsive_delivery_ladder, img_lift_960_small_viewport_payload_budget [INFERRED 0.85]

## Communities (29 total, 1 thin omitted)

### Community 0 - "Core Runtime And Scene Hooks"
Cohesion: 0.08
Nodes (55): Eight-Chapter Descent Structure, data-palette Scene Theme Attribute, data-reveal Entrance Hooks, Begin Shift Enter Button, Journey Scroll Container, CSS Elevator Car, Module Entry Script Tag, Noscript Non-Compliant Terminal Fallback (+47 more)

### Community 1 - "Chapter Narrative And Design Decisions"
Cohesion: 0.06
Nodes (50): Audio gated behind an entry gesture, Browser support and WebGL fallback, Chapter 00 — Induction, Chapter 01 — The Descent, Chapter 02 — The Floor, Chapter 03 — Macrodata Refinement, Chapter 04 — Personnel, Chapter 05 — Doctrine (+42 more)

### Community 2 - "WebGL World And Shaders"
Cohesion: 0.09
Nodes (21): data-cursor and data-magnet Pointer Hooks, Geometry-to-Photography Corridor Handoff, gl-stage WebGL Canvas, Fixed Instrument Panel HUD, Persistent Layer Architecture, Scene 02 The Severed Floor (corridor), deviceTier(), lerp() (+13 more)

### Community 3 - "Package Manifest And Dependencies"
Cohesion: 0.06
Nodes (35): description, devDependencies, esbuild, puppeteer-core, sharp, three, keywords, license (+27 more)

### Community 4 - "Production Build Script"
Cohesion: 0.10
Nodes (16): argv, cssSource, emit(), gz(), html, imgFiles, jsFile, LIBS (+8 more)

### Community 5 - "Ambience Audio Engine"
Cohesion: 0.18
Nodes (7): Ambience Toggle Control, Severance Barrier Readout, Lumon Boot Terminal Preloader, Mid-Scene Palette Switch, Scene 01 Descent (pinned elevator), Ambience, initAudio()

### Community 6 - "Atrium Backdrop Plate"
Cohesion: 0.23
Nodes (15): Responsive WebP Variant Pipeline, Atrium Backdrop 1536px WebP Variant, Letterbox Bars Cropped In Delivery Variant, Atrium Backdrop 960px WebP Variant, Atrium Lobby Artwork (Source Render), Brutalist Concrete Architecture, Cinematic Letterbox Framing, Cold Desaturated Grey-Blue Palette (+7 more)

### Community 7 - "Break Room Backdrop Plate"
Cohesion: 0.26
Nodes (14): Responsive Image Size Ladder Pipeline, Breakroom Responsive Variant 1536w (WebP), Mobile Bandwidth Budget For Backdrop Delivery, Breakroom Responsive Variant 960w (WebP), Breakroom Scene Backdrop (source artwork), Chiaroscuro Pool Of Light Staging, Dim Windowless Breakroom Interior, Grid Tiled Institutional Floor (+6 more)

### Community 8 - "Text Splitting Engine"
Cohesion: 0.22
Nodes (9): data-split Text Splitting Hooks, conceal(), scatter(), buildWords(), explodeChars(), groupLines(), split(), SplitRegistry (+1 more)

### Community 9 - "Egress Stairwell Plate"
Cohesion: 0.28
Nodes (13): Egress 1536px WebP Responsive Variant, Egress 960px WebP Responsive Variant, Ascending Steps and Landing Before the Doors, Bare Concrete Service Stairwell Interior, Caged Bulkhead Ceiling Lamp (Sole Light Source), Closed Double Elevator Doors, Dark Negative Space Reserved for Overlaid Text, Liminal Threshold Motif: Exit That May Not Open (+5 more)

### Community 10 - "Office Floor Backdrop Plate"
Cohesion: 0.26
Nodes (13): Floor Backdrop 1536px WebP Variant, WebP Compression Weight Reduction Tradeoff, Responsive Image Delivery Pipeline, Floor Backdrop 960px WebP Variant, Central Potted Plant Vanishing Point Anchor, Corporate Liminal Isolation Atmosphere, Desaturated Teal And Grey Palette, Fluorescent Panel Drop Ceiling Lighting (+5 more)

### Community 11 - "Elevator Cabin Plate"
Cohesion: 0.28
Nodes (13): Responsive WebP Delivery Ladder For Lift Plate, Lift Plate 1536px WebP Variant, Lift Plate 960px WebP Variant, Small Viewport Payload Budget, Single Ceiling Dome Light, Closed Brushed Steel Elevator Doors, Dark Panelled Cabin Walls With Handrails, Descent Scene Backdrop Plate (+5 more)

### Community 12 - "Photographic Plate Loader"
Cohesion: 0.29
Nodes (12): Atrium Responsive Image Preload, Lamp-Masked Break Room Plate, data-plate Photographic Plate Figures, Scene 06 Compliance (break room), Scene 00 Induction (hero), Five-Band Slat Mask Reveal, chapter(), EAGER (+4 more)

### Community 13 - "MDR Refiner Canvas"
Cohesion: 0.29
Nodes (4): MDR Refiner Console Canvas, rand(), randInt(), MdrScreen

### Community 14 - "Corridor Backdrop Plate"
Cohesion: 0.30
Nodes (12): Responsive WebP Delivery Ladder for the Corridor Plate, Corridor Plate 1536px WebP Variant, Corridor Plate 960px WebP Variant, Cinematic Letterbox Bars Framing the Render, Infinite White Office Corridor Plate (source render), Blown-Out Desaturated Green-White Colour Palette, Rows of Identical Unmarked Flush Doors, Institutional Liminal Space Mood (+4 more)

### Community 15 - "Helly Badge Portrait"
Cohesion: 0.35
Nodes (11): Badge Helly 1024px WebP Variant, Badge Helly 640px WebP Variant, Responsive WebP Size Ladder (640/1024), Analog Film Grain and Muted Colour Treatment, Corporate White Collared Blouse, Employee Badge / Personnel Portrait Asset, Grey Studio Backdrop with Cast Shadow, Helly, Personnel Record Subject (+3 more)

### Community 16 - "Mark Badge Portrait"
Cohesion: 0.33
Nodes (11): Responsive WebP Asset Generation Pipeline, Badge Mark 1024px WebP Variant, Badge Mark 640px WebP Variant, Faded Analog Film Photographic Treatment, Anonymous Rear-View Head Composition, Badge Mark Source Portrait Photograph, Corporate Dress Code Wardrobe (White Shirt, Dark Tie), Employee Badge / Personnel Portrait Asset Role (+3 more)

### Community 17 - "Smoke Test Harness"
Cohesion: 0.18
Nodes (10): CHROME, dirArg, errors, MIME, notable, ROOT, server, SHOTS (+2 more)

### Community 18 - "Dylan Badge Portrait"
Cohesion: 0.36
Nodes (10): Dylan Badge 1024px WebP Variant, Dylan Badge 640px WebP Variant, Responsive WebP Delivery Set for Badge Imagery, Anonymized Faceless Identity (Features Fully in Shadow), Backlit Rim-Light Studio Setup Against Pale Background, Dylan Badge Portrait (Source PNG), Dark Collared Button-Up Shirt Attire, Employee Badge Personnel Portrait Asset Role (+2 more)

### Community 19 - "Irving Badge Portrait"
Cohesion: 0.33
Nodes (10): badge-irving-1024.webp Responsive Variant, badge-irving-640.webp Responsive Variant, Responsive WebP Delivery Pipeline, Character Identity: Irving, Employee Badge Personnel Portrait Role, Mid-Century Corporate Photographic Aesthetic, Obscured Identity / Facelessness Motif, Rim-Light, Sepia Tone and Vignette Treatment (+2 more)

### Community 20 - "Image Asset Pipeline"
Cohesion: 0.20
Nodes (8): CROP, lqip, manifest, OUT, ROOT, sources, SRC, WIDTHS

### Community 21 - "Mobile Viewport Checker"
Cohesion: 0.22
Nodes (8): CHROME, dirArg, errors, MIME, overflow, ROOT, server, SHOTS

### Community 22 - "Kier Founder Portrait"
Cohesion: 0.46
Nodes (8): Responsive WebP Size Ladder For Portrait Delivery, Kier Portrait 1024px WebP Variant, Kier Portrait 640px WebP Variant, 19th Century Academic Oil Portrait Style, Corporate Founder Iconography Asset, Smokestack Industrial Cityscape Backdrop, Kier Portrait Source Artwork (PNG Master), Elderly Victorian Patriarch Subject

### Community 23 - "Card Layout Probe"
Cohesion: 0.25
Nodes (7): CHROME, h, MIME, ROOT, server, w, y

### Community 24 - "Screenshot Frame Capture"
Cohesion: 0.33
Nodes (5): CHROME, MIME, ROOT, server, [vw, vh]

### Community 25 - "Element Position Probe"
Cohesion: 0.33
Nodes (5): CHROME, MIME, ROOT, server, [y, ...selectors]

### Community 26 - "Doctrine And Dossier Content"
Cohesion: 0.40
Nodes (5): Faceless Management Dossiers, Nine Core Tenets of Kier, Rotating Tenet Ring, Compliance Statement Lines, Personnel Dossier Track

### Community 28 - "Static Dev Server"
Cohesion: 0.50
Nodes (3): MIME, ROOT, server

## Ambiguous Edges - Review These
- `CustomEase 'lumon' curve` → `Chapter 05 — Doctrine`  [AMBIGUOUS]
  README.md · relation: conceptually_related_to
- `Cold Desaturated Grey-Blue Palette` → `Severance / Lumon Corporate Aesthetic`  [AMBIGUOUS]
  img/src/atrium.png · relation: conceptually_related_to
- `Depopulated Corporate Interior` → `Severance / Lumon Corporate Aesthetic`  [AMBIGUOUS]
  img/src/atrium.png · relation: conceptually_related_to
- `Anonymized Faceless Identity (Features Fully in Shadow)` → `Employee Badge Personnel Portrait Asset Role`  [AMBIGUOUS]
  img/src/badge-dylan.png · relation: conceptually_related_to
- `Silhouetted Profile Portrait of Suited Man` → `badge-irving-1024.webp Responsive Variant`  [AMBIGUOUS]
  img/badge-irving-1024.webp · relation: references
- `Letterboxed Cinematic One Point Perspective Framing` → `Floor Backdrop 960px WebP Variant`  [AMBIGUOUS]
  img/floor-960.webp · relation: conceptually_related_to
- `Low Key Chiaroscuro Lighting Treatment` → `Lift Plate 1536px WebP Variant`  [AMBIGUOUS]
  img/lift-1536.webp · relation: conceptually_related_to

## Knowledge Gaps
- **101 isolated node(s):** `MOODS`, `state`, `themeListeners`, `backdrop`, `wall` (+96 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `CustomEase 'lumon' curve` and `Chapter 05 — Doctrine`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Cold Desaturated Grey-Blue Palette` and `Severance / Lumon Corporate Aesthetic`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Depopulated Corporate Interior` and `Severance / Lumon Corporate Aesthetic`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Anonymized Faceless Identity (Features Fully in Shadow)` and `Employee Badge Personnel Portrait Asset Role`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Silhouetted Profile Portrait of Suited Man` and `badge-irving-1024.webp Responsive Variant`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `Letterboxed Cinematic One Point Perspective Framing` and `Floor Backdrop 960px WebP Variant`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Low Key Chiaroscuro Lighting Treatment` and `Lift Plate 1536px WebP Variant`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._