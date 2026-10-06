---
title: WordPress
description: Add the Permito banner to a WordPress site with the script tag build, from a small plugin or a child theme.
---

WordPress needs no extra package: use the [script tag build](script-tag.md). This page shows where the pieces go. The snippets use the standard WordPress functions `wp_enqueue_script`, `wp_add_inline_script` and `wp_head`. Try them on a staging site first: themes, caching plugins and "defer" or "minify" plugins can change the order scripts load in.

## 1. Host the file

Copy `permito.global.js` from the `@permitojs/core` package (folder `dist/`) into your plugin or child theme, for example `wp-content/plugins/permito/permito.global.js`.

## 2. A small plugin

Create `wp-content/plugins/permito/permito.php`:

```php
<?php
/**
 * Plugin Name: Permito consent banner
 */

// 1. The config, printed before the script.
add_action('wp_head', function () {
    $config = [
        'config' => [
            'consentVersion' => '2026-10',
            'language' => 'de-CH',
            'categories' => [
                ['id' => 'necessary', 'required' => true],
                ['id' => 'statistics'],
                ['id' => 'marketing'],
            ],
        ],
        'privacyPolicyUrl' => '/datenschutz',
    ];
    echo '<script type="application/json" id="permito-config">'
        . wp_json_encode($config, JSON_HEX_TAG | JSON_UNESCAPED_SLASHES)
        . '</script>';
}, 1);

// 2. The script itself, in the head and without defer, so it can block other scripts.
add_action('wp_enqueue_scripts', function () {
    wp_enqueue_script(
        'permito',
        plugins_url('permito.global.js', __FILE__),
        [],
        '1.0.0',
        false // false = in the head
    );
});

// 3. Tell the script where its config is.
add_filter('script_loader_tag', function ($tag, $handle) {
    if ($handle === 'permito') {
        return str_replace(' src=', ' data-config="#permito-config" src=', $tag);
    }
    return $tag;
}, 10, 2);
```

Activate the plugin. The banner appears for visitors who have not decided yet.

## 3. Block other scripts

Scripts from other plugins (analytics, pixels, chat) are the actual problem: they run before the visitor decided. Permito can only gate what you change into `type="text/plain"` with a `data-consent-category`, see [Blocking scripts and embeds](blocking.md). For a script you add yourself, use `wp_head` and print the tag. For a script that another plugin prints, check whether the plugin has a setting to disable its script or to load it later; otherwise it cannot be gated from here.

Check the result with your browser's network tab in a private window before you accept: no request to an analytics or marketing host should appear.

## 4. Settings link

Add `data-permito-open` to a menu link or footer link:

```html
<a href="#" data-permito-open>Cookie-Einstellungen</a>
```

## Caching

If a page cache serves the same HTML to everyone, that is fine: the banner is rendered in the browser from the stored decision. Do not cache the config for a long time after you change `consentVersion`.
