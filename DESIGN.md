# Design

## Overview

Welve no es un dashboard genérico — es la herramienta operativa de 
un salón premium. El sistema visual tiene carácter: sidebar oscuro 
(Haiti) como columna vertebral permanente, contenido en Blue Chalk 
con tipografía display bold para métricas que impactan, y un layout 
asimétrico que crea jerarquía visual sin depender del color.

El violet eléctrico ancla acciones primarias. El amarillo Turbo 
aparece solo en momentos de alta energía. El movimiento es 
deliberado — cada animación tiene una razón.

## Design Language

**Strategy:** Committed en el sidebar (Haiti ~30% de pantalla). 
Asimétrico en el contenido — las grillas varían según la jerarquía 
de la información, no por convención.

**Physical scene:** Admin en escritorio tras el mostrador mirando 
métricas del día. Especialista en tablet entre cliente y cliente. 
Clienta en móvil eligiendo horario desde casa. Tres contextos, 
tres velocidades de lectura.

**Typographic hierarchy:** Los números importantes van en display 
bold grande. Las tablas van en text-sm denso. Los labels van en 
text-xs muted. La jerarquía se construye con tamaño y peso, 
no solo con color.

**Layout philosophy:** No todas las cards son iguales. Una métrica 
clave puede ocupar el doble de espacio. El calendario puede dominar 
una columna completa. Los elementos secundarios se comprimen. 
La grilla sirve al contenido, no al revés.

**Register:** product

## Colors

Todos los valores en OKLCH.

### Primitives

```css