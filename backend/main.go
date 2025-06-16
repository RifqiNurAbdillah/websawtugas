package main

import (
	"log"
	"net/http"

	"fmt"
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"gorm.io/datatypes"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

// Model Kriteria
type Kriteria struct {
	ID    uint    `json:"id" gorm:"primaryKey"`
	Nama  string  `json:"nama"`
	Bobot float64 `json:"bobot"`
}

// Model Siswa
type Siswa struct {
	ID    uint              `json:"id" gorm:"primaryKey"`
	Nama  string            `json:"nama"`
	Nilai datatypes.JSONMap `json:"nilai" gorm:"type:json"`
}

var db *gorm.DB

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Gagal load file .env")
	}

	dbUser := os.Getenv("DB_USER")
	dbPass := os.Getenv("DB_PASS")
	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")
	dbName := os.Getenv("DB_NAME")

	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true", dbUser, dbPass, dbHost, dbPort, dbName)

	db, err = gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Gagal koneksi database:", err)
	}

	// Auto migrate
	if err := db.AutoMigrate(&Kriteria{}, &Siswa{}); err != nil {
		log.Fatal("Gagal migrasi tabel:", err)
	}

	r := gin.Default()
	r.Use(cors.Default())

	// Kriteria endpoints
	r.GET("/kriteria", getKriteria)
	r.POST("/kriteria", postKriteria)
	r.PUT("/kriteria/:id", putKriteria)
	r.DELETE("/kriteria/:id", deleteKriteria)

	// Siswa endpoints
	r.GET("/siswa", getSiswa)
	r.POST("/siswa", postSiswa)
	r.PUT("/siswa/:id", putSiswa)
	r.DELETE("/siswa/:id", deleteSiswa)

	log.Println("Server jalan di http://localhost:8080")
	r.Run(":8080")
}

// CRUD Kriteria
func getKriteria(c *gin.Context) {
	var data []Kriteria
	db.Find(&data)
	c.JSON(http.StatusOK, data)
}

func postKriteria(c *gin.Context) {
	var input Kriteria
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	db.Create(&input)
	c.JSON(http.StatusCreated, input)
}

func putKriteria(c *gin.Context) {
	id := c.Param("id")
	var input Kriteria
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	var k Kriteria
	if err := db.First(&k, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Kriteria tidak ditemukan"})
		return
	}
	if input.Nama != "" {
		k.Nama = input.Nama
	}
	if input.Bobot >= 0 && input.Bobot <= 1 {
		k.Bobot = input.Bobot
	}
	db.Save(&k)
	c.JSON(http.StatusOK, k)
}

func deleteKriteria(c *gin.Context) {
	id := c.Param("id")
	if err := db.Delete(&Kriteria{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus data"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Data berhasil dihapus"})
}

// CRUD Siswa
func getSiswa(c *gin.Context) {
	var data []Siswa
	db.Find(&data)
	c.JSON(http.StatusOK, data)
}

func postSiswa(c *gin.Context) {
	var input Siswa
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	db.Create(&input)
	c.JSON(http.StatusCreated, input)
}

func putSiswa(c *gin.Context) {
	id := c.Param("id")
	var input Siswa
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	var s Siswa
	if err := db.First(&s, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Siswa tidak ditemukan"})
		return
	}
	s.Nama = input.Nama
	s.Nilai = input.Nilai
	db.Save(&s)
	c.JSON(http.StatusOK, s)
}

func deleteSiswa(c *gin.Context) {
	id := c.Param("id")
	if err := db.Delete(&Siswa{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus data"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Siswa berhasil dihapus"})
}
