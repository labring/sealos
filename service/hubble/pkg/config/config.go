package config

type AuthConfig struct {
	WhiteList string `yaml:"whiteList"`
}

type HTTPConfig struct {
	Port string `yaml:"port"`
}

type HubbleConfig struct {
	Addr string `yaml:"addr"`
}

type RedisConfig struct {
	Addr     string `yaml:"addr"`
	Username string `yaml:"username"`
	Password string `yaml:"password"`
	DB       int    `yaml:"db"`
}

type Config struct {
	Auth   AuthConfig   `yaml:"auth"`
	HTTP   HTTPConfig   `yaml:"http"`
	Hubble HubbleConfig `yaml:"hubble"`
	Redis  RedisConfig  `yaml:"redis"`
}
