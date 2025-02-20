package image

import (
	"image"
	"image/color"
	"io"

	"github.com/srwiley/oksvg"
	"github.com/srwiley/rasterx"
)

func Decode(r io.Reader) (image.Image, error) {
	icon, err := oksvg.ReadIconStream(r)
	if err != nil {
		return nil, err
	}

	w, h := int(icon.ViewBox.W), int(icon.ViewBox.H)
	icon.SetTarget(0, 0, float64(w), float64(h))

	rgba := image.NewRGBA(image.Rect(0, 0, w, h))
	icon.Draw(rasterx.NewDasher(w, h, rasterx.NewScannerGV(w, h, rgba, rgba.Bounds())), 1)

	return rgba, err
}

func DecodeConfig(r io.Reader) (image.Config, error) {
	var config image.Config

	icon, err := oksvg.ReadIconStream(r)
	if err != nil {
		return config, err
	}

	config.ColorModel = color.RGBAModel
	config.Width = int(icon.ViewBox.W)
	config.Height = int(icon.ViewBox.H)

	return config, nil
}

func init() {
	image.RegisterFormat("svg", "<?xml ", Decode, DecodeConfig)
	image.RegisterFormat("svg", "<svg", Decode, DecodeConfig)
}
