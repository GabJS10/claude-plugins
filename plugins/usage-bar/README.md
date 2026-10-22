# usage-bar

Status line minimalista para Claude Code que muestra el uso de tu suscripción: la ventana de 5 horas y la semanal, con el tiempo que falta para cada reinicio.

Ejemplo:

```
5h ▰▰▰▰▱▱▱▱▱▱ 48% · 2h13m   7d ▰▰▱▱▱▱▱▱▱▱ 22% · 3d4h
```

## Colores

El color base es el terracota de Claude (`#D97757`). La barra se intensifica al llegar al 80% y al 95% de uso.

## Requisitos

- Node.js
- Plan Pro o Max

## Instalación

```
/plugin marketplace add <ruta-o-repo>
/plugin install usage-bar@gabjs-plugins
/usage-bar:install
```

Tras instalar, la barra aparece después del próximo mensaje.

## Desinstalación

```
/usage-bar:uninstall
```

## Notas

- Los plugins no pueden registrar un `statusLine` directamente, así que `install` copia el script a `~/.claude/usage-bar/` y configura `statusLine` en `~/.claude/settings.json`. Si ya tenías un `statusLine`, se guarda una copia de seguridad antes de sobrescribirlo, y `uninstall` la restaura.
- Soporta `NO_COLOR` para desactivar los colores.
- En terminales de menos de 50 columnas las barras se ocultan.

## Tests

```
node --test plugins/usage-bar/test/*.test.js
```
