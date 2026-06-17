<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <style>
        @page {
            size: {{ $layout['width_px'] }}px {{ $layout['height_px'] }}px;
            margin: 0;
        }
        html, body {
            margin: 0;
            padding: 0;
            width: {{ $layout['width_px'] }}px;
            height: {{ $layout['height_px'] }}px;
            box-sizing: border-box;
            font-family: 'DejaVu Sans', sans-serif;
            font-size: 11px;
            line-height: 1.3;
            background-color: #ffffff;
            color: #000000;
        }
        .wrapper {
            width: {{ $layout['width_px'] }}px;
            height: {{ $layout['height_px'] }}px;
            padding: 25px 30px 20px 30px;
            box-sizing: border-box;
            position: relative;
        }
        .title {
            text-align: center;
            font-weight: bold;
            font-size: 15px;
            line-height: 1.25;
            margin-bottom: 15px;
            height: 38px;
        }
        .bold {
            font-weight: bold;
        }
        .margin-b {
            margin-bottom: 5px;
        }
        .info-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            margin-bottom: 5px;
        }
        .info-table td {
            padding: 0;
            vertical-align: top;
        }
        .badges-cell {
            width: 90px;
            text-align: center;
            vertical-align: middle !important;
        }
        .eac-text {
            font-weight: bold;
            font-size: 22px;
            margin-bottom: 12px;
            letter-spacing: 1px;
        }
        .recycle-block {
            border: 1.5px solid #000;
            width: 42px;
            margin: 0 auto;
            padding: 2px 0;
            text-align: center;
        }
        .recycle-num {
            font-weight: bold;
            font-size: 14px;
            line-height: 1;
        }
        .recycle-name {
            font-size: 8px;
            font-weight: bold;
            display: block;
            margin-top: 1px;
        }
        .regulation {
            font-size: 9px;
            text-align: center;
            margin-top: 12px;
            line-height: 1.3;
        }
        .barcode-container {
            position: absolute;
            bottom: 20px;
            left: 0;
            width: 100%;
            text-align: center;
        }
        .barcode-img {
            width: 240px;
            height: 50px;
            display: block;
            margin: 0 auto;
        }
        .barcode-text {
            font-size: 12px;
            margin-top: 4px;
            letter-spacing: 5px;
        }
    </style>
</head>
<body>
    @php
        $d = $row['data'] ?? [];
        $recycling = $d['recycling'] ?? null;
        $isCircular = $d['is_circular'] ?? false;
        $size = $d['size'] ?? '';
        $composition = $d['composition'] ?? '';
        $productName = $d['product_name'] ?? 'Набор салфеток для сервировки стола - 2 шт.';
        $article = $d['supplier_article'] ?? '';
        $manufacturer = $d['factory_name'] ?? $d['manufacturer'] ?? $layout['manufacturer_name'] ?? '';
        $manufactureDate = !empty($d['manufacture_date'])
            ? (preg_match('/[а-яё]/ui', $d['manufacture_date'])
                ? $d['manufacture_date']
                : \Carbon\Carbon::parse($d['manufacture_date'])->locale('ru')->translatedFormat('F Y'))
            : \Carbon\Carbon::now()->locale('ru')->translatedFormat('F Y');
        $recycleCode = $recycling['code'] ?? '3';
        $recycleLabel = $recycling['label'] ?? 'PVC';
    @endphp

    <div class="wrapper">
        <div class="title">{{ $productName }}</div>

        <div class="margin-b"><span class="bold">Торговая марка:</span> {{ $brand['trademark'] ?? 'FoHo' }}</div>

        <div class="margin-b"><span class="bold">Артикул:</span> {{ $article }}</div>

        <div>
            <span class="bold">Размер:</span> {{ str_replace('.', ',', $size) }}.
            @if($isCircular)
                (диаметр одного изделия)
            @endif
        </div>
        <div style="font-size: 9.5px; margin-bottom: 8px;">Допускается отклонение в размерах &plusmn; 1 см.</div>

        <div class="margin-b"><span class="bold">Срок годности:</span> не ограничен</div>

        <div class="margin-b"><span class="bold">Состав:</span> {{ $composition }}</div>

        <table class="info-table">
            <tr>
                <td>
                    <div class="margin-b"><span class="bold">Импортёр:</span> {{ $layout['importer_name'] }}</div>
                    <div class="margin-b"><span class="bold">Адрес:</span> {{ $layout['importer_address'] }}</div>
                    <div class="margin-b"><span class="bold">Телефон:</span> {{ $layout['importer_phone'] }}</div>
                    <div class="margin-b"><span class="bold">Изготовитель:</span> {{ $manufacturer }}</div>
                    <div><span class="bold">Дата производства:</span> {{ $manufactureDate }}</div>
                </td>

                <td class="badges-cell">
                    <div class="eac-text">EAC</div>
                    <div class="recycle-block">
                        <div class="recycle-num">{{ $recycleCode }}</div>
                        <div class="recycle-name">{{ $recycleLabel }}</div>
                    </div>
                </td>
            </tr>
        </table>

        <div class="regulation">
            Соответствует требованиям ТР ТС 017/2011<br>
            &laquo;О безопасности продукции легкой промышленности&raquo;
        </div>

        <div class="barcode-container">
            @if(!empty($barcode))
                <img src="{{ $barcode }}" class="barcode-img" alt="barcode">
            @endif
            <div class="barcode-text">{{ $d['barcode'] ?? '' }}</div>
        </div>
    </div>
</body>
</html>
