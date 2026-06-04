import { Svg, Path, Text } from '@react-pdf/renderer';

const ARROW_PATH =
    'M56.2127 33.3528L48.5826 20.1368L48.0497 23.951L44.2413 22.6433L51.8896 35.8909L51.9297 35.9579C52.4482 36.7962 52.7222 37.7626 52.7208 38.7483C52.7208 41.6517 50.3787 44.0185 47.4846 44.0582L47.4516 44.056L47.3678 44.0589H37.0409V40.7169L29.6365 46.5654L37.0409 52.4139V49.0719H47.4212L47.45 49.0717C53.1242 49.0503 57.7338 44.4273 57.7338 38.7483C57.7354 36.8438 57.2088 34.9761 56.2127 33.3528ZM25.3165 46.4676L27.823 44.0591H14.5852C12.694 44.0591 10.9319 43.0414 9.98649 41.4037C9.04105 39.7659 9.04105 37.731 9.98616 36.0931L14.6542 28.008L17.5156 29.6979L16.245 20.3482L7.44391 23.7495L10.3376 25.4586L5.64492 33.5869C3.80716 36.7707 3.80716 40.7264 5.64492 43.9102C7.48335 47.0941 10.9092 49.072 14.5854 49.072H27.8232L25.3165 46.4676ZM19.2978 19.9657L26.3975 7.66802C27.3433 6.03011 29.1053 5.01281 30.9965 5.01281C32.8874 5.01281 34.6498 6.03011 35.5953 7.66802L39.5564 14.5293L36.5541 16.2078L45.2723 19.8165L46.7639 10.4997L43.9327 12.0826L39.9367 5.16153C38.0983 1.97779 34.6727 0 30.9965 0C27.32 0 23.8945 1.97779 22.0561 5.1617L14.9564 17.4594L18.6867 16.1899L19.2978 19.9657Z';

interface RecyclingSignProps {
    recycleCode: string;
    recycleLabel: string;
}

export default function RecyclingSign({
    recycleCode,
    recycleLabel,
}: RecyclingSignProps) {
    const code = recycleCode.replace(/^0+/, '');

    return (
        <Svg width={62} height={62} viewBox="0 0 62 62">
            <Path fill="#333333" d={ARROW_PATH} />
            <Text
                x={31}
                y={38}
                textAnchor="middle"
                fill="#333333"
                style={
                    {
                        fontFamily: 'Roboto',
                        fontSize: 24,
                        fontWeight: 700,
                    } as any
                }
            >
                {code}
            </Text>
            <Text
                x={31}
                y={62}
                textAnchor="middle"
                fill="#333333"
                style={
                    {
                        fontFamily: 'Roboto',
                        fontSize: recycleLabel.length > 3 ? 10 : 12,
                        fontWeight: 700,
                    } as any
                }
            >
                {recycleLabel}
            </Text>
        </Svg>
    );
}
