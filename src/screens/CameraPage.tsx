import React, {useState, useLayoutEffect, useCallback, useEffect} from 'react';
import {
  LayoutChangeEvent,
  PixelRatio,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Pages from '@utils/pages';
import {RootStackParamList} from 'types/navigation';
import {CameraPageRight} from '@components/NavigationHeader';

import {
  Camera,
  useCameraDevices,
  useFrameProcessor,
} from 'react-native-vision-camera';
import {OCRFrame, scanOCR} from 'vision-camera-ocr';
import {runOnJS} from 'react-native-reanimated';
import {StackScreenProps} from '@react-navigation/stack';

// * Types
type Props = StackScreenProps<RootStackParamList, Pages.CAMERA>;
export type FlashActiveProps = 'off' | 'on' | undefined;
type BoundingFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
  boundingCenterX: number;
  boundingCenterY: number;
};
type Point = {x: number; y: number};

type TextElement = {
  text: string;
  frame: BoundingFrame;
  cornerPoints: Point[];
};

type TextLine = {
  text: string;
  elements: TextElement[];
  frame: BoundingFrame;
  recognizedLanguages: string[];
  cornerPoints: Point[];
};

const CameraPage = ({navigation}: Props) => {
  // * State's
  const [isFlashActive, setIsFlashActive] = useState<FlashActiveProps>('off');
  const [ocr, setOcr] = useState<OCRFrame>();

  // * Vision Camera Hooks
  const devices = useCameraDevices();
  const device = devices.back;

  const [pixelRatio, setPixelRatio] = useState<number>(1);
  const [getTextLine, setTextLine] = useState<TextLine>();

  // * Functions
  const frameProcessor = useFrameProcessor(frame => {
    'worklet';
    const data = scanOCR(frame);
    runOnJS(setOcr)(data);
  }, []);
  const navigate = useCallback(
    (plate: string) => {
      navigation.navigate(Pages.PLATE_INFO, {
        plate,
      });
    },
    [navigation],
  );

  const renderOverlay = () => {
    return (
      <>
        <TouchableOpacity
          onPress={() => {
            // Clipboard.setString(block.text);
            // Alert.alert(`"${getTextLine?.text}" copied to the clipboard`);
          }}
          style={{
            position: 'absolute',
            left: (getTextLine?.frame.x || 0) * pixelRatio,
            top: (getTextLine?.frame.y || 0) * pixelRatio,
            backgroundColor: 'white',
            padding: 8,
            borderRadius: 6,
          }}>
          <Text
            style={{
              fontSize: 25,
              justifyContent: 'center',
              textAlign: 'center',
            }}>
            {getTextLine?.text}
          </Text>
        </TouchableOpacity>
      </>
    );
  };

  // * Effects
  useEffect(() => {
    ocr?.result?.blocks?.map(block => {
      block.lines?.map(line => {
        if (line.text) {
          console.info(
            `Found text line ${line.text} with box ${line.frame.y}, ${line.frame.x}`,
          );
          setTextLine(line);
        }
      });
    });
  }, [navigate, ocr]);
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => {
        return (
          <CameraPageRight
            isFlashActive={isFlashActive}
            setIsFlashActive={setIsFlashActive}
          />
        );
      },
    });
  }, [navigation, isFlashActive]);

  return (
    <View style={styles.wrapper}>
      {device ? (
        <>
          <Camera
            style={{...StyleSheet.absoluteFillObject}}
            frameProcessor={frameProcessor}
            device={device}
            isActive={true}
            enableZoomGesture
            torch={isFlashActive}
            frameProcessorFps={1}
            onLayout={(event: LayoutChangeEvent) => {
              setPixelRatio(
                event.nativeEvent.layout.width /
                  PixelRatio.getPixelSizeForLayoutSize(
                    event.nativeEvent.layout.width,
                  ),
              );
            }}
          />
          {renderOverlay()}
        </>
      ) : (
        <View style={styles.notAvailableContainer}>
          <Text>Camera not available</Text>
        </View>
      )}
    </View>
  );
};
const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  notAvailableContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
export default CameraPage;
