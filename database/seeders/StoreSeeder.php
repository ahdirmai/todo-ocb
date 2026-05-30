<?php

namespace Database\Seeders;

use App\Models\Store;
use Illuminate\Database\Seeder;

class StoreSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $stores = [
            ['branch_code' => 'OC1', 'name' => 'OSCAR CELL', 'address' => 'Jl. Cempaka Raya No.12 Telaga Biru Banjarmasin Barat'],
            ['branch_code' => 'OC2', 'name' => 'OSCAR CELL', 'address' => 'Jl. Mayjen Sutoyo S No.58, Tlk. Dalam, Kec. Banjarmasin Tengah'],
            ['branch_code' => 'OC3', 'name' => 'OSCAR CELL', 'address' => 'Jln A Yani, Angsau Pelaihari'],
            ['branch_code' => 'OC4', 'name' => 'OSCAR CELL', 'address' => 'Jl tembus mantuil rt 21 rw 02 no 33 (dipinggir jalan)'],
            ['branch_code' => 'OC5', 'name' => 'AL RAIS CELL', 'address' => 'Cempaka raya dekat futsal'],
            ['branch_code' => 'OC6', 'name' => 'ARFA CELL', 'address' => 'Jl Sutoyo s simp kini balu Banjarmasin tengah'],
            ['branch_code' => 'OC7', 'name' => 'SULAIMAN CELL', 'address' => 'Jl Sultan adam, Surgi mufti, kec Banjarmasin utara, Samping komplek taekwondo.'],
            ['branch_code' => 'OC8', 'name' => 'SULAIMAN CELL', 'address' => 'Arah Takisung'],
            ['branch_code' => 'OC9', 'name' => 'OSCAR PONSEL', 'address' => 'Jl. Sultan adam , Surgi Mufti Kec banjarmasin utara kota banjarmasin kalimantan selatan'],
            ['branch_code' => 'OC10', 'name' => 'AL RAIS CELL', 'address' => 'Jl. K.S Tubun kelayan barat, Banjarmasin Selatan'],
            ['branch_code' => 'OC11', 'name' => 'OSCAR CELL', 'address' => 'Jl.tembus mantuil parak kubah habib betilantang'],
            ['branch_code' => 'OC12', 'name' => 'ARFA CELL', 'address' => 'JL. Veteran Sei Sipai RT.18 RW. 05 Mentaos BJB Utara'],
            ['branch_code' => 'OC13', 'name' => 'ARFA CELL', 'address' => 'JL. Tanjung Rema Darat RT. 04 RW. 02 Kecamatan Martapura'],
            ['branch_code' => 'OC14', 'name' => 'SULAIMAN CELL', 'address' => 'JL. Rahayu Sei Paring Banjarbaru RT. 09 RW. 04'],
            ['branch_code' => 'OC15', 'name' => 'OSCAR CELL', 'address' => 'Jln.Purna Sakti'],
            ['branch_code' => 'OC16', 'name' => 'OSCAR CELL', 'address' => 'JL. Karang Anyar 1 No 52,Loktabat Utara Banjarbaru'],
            ['branch_code' => 'OC17', 'name' => 'PONSEL SAYANG', 'address' => 'JL.Karangso RT. 39 RW. 01 Loktabat Utara Banjarbaru'],
            ['branch_code' => 'OC18', 'name' => 'SULAIMAN  CELL', 'address' => 'JL.Panglima Batur Kota Banjarbaru (70714)'],
            ['branch_code' => 'OC19', 'name' => 'SULAIMAN CELL', 'address' => 'Jln. Sungai Andai Kelurahan Sungai Andai'],
            ['branch_code' => 'OC20', 'name' => 'SULAIMAN CELL', 'address' => 'Jln. Kebun Karet , Banjarbaru'],
            ['branch_code' => 'OC21', 'name' => 'OSCAR CELL', 'address' => 'Jln. Sekumpul Martapura Sebelah Rumah Sakit Pelita Insani'],
            ['branch_code' => 'OC22', 'name' => 'SULAIMAN CELL', 'address' => 'Pematang Panjang,Gambut'],
            ['branch_code' => 'OC23', 'name' => 'SULAIMAN CELL', 'address' => 'Jln Simpang 4 Amaco'],
            ['branch_code' => 'OC24', 'name' => 'OSCAR CELL', 'address' => 'Jln. Kampung Melayu Darat, sebelah Crsytal bakery'],
            ['branch_code' => 'OC25', 'name' => 'OSCAR CELL', 'address' => 'Jln. A Yani KM 84 Sebrang gedung serba Guna Binuang'],
            ['branch_code' => 'OC27', 'name' => 'SULAIMAN CELL', 'address' => 'Handil Bakti'],
            ['branch_code' => 'OC26', 'name' => 'OSCAR CELL', 'address' => 'Astambul Martapura'],
            ['branch_code' => 'OC28', 'name' => 'OSCAR CELL', 'address' => 'Jln Raya Timur Binuang, Transed (Oscar Cell, Depan Koramil)'],
            ['branch_code' => 'OC29', 'name' => 'SULAIMAN CELL', 'address' => 'Martapura, Jln Pendidikan'],
            ['branch_code' => 'OC30', 'name' => 'SULAIMAN CELL', 'address' => 'Pelaihari, Arah pantai takisung'],
            ['branch_code' => 'OC31', 'name' => 'SULAIMAN CELL', 'address' => 'Manarap Tengah'],
            ['branch_code' => 'OC32', 'name' => 'SULAIMAN CELL', 'address' => 'Martapura, Depan Kubah'],
            ['branch_code' => 'OC33', 'name' => 'OSCAR CELL', 'address' => 'Kasturi 2 Landasan Ulim'],
            ['branch_code' => 'OC34', 'name' => 'SULAIMAN CELL', 'address' => 'Kampung Jawa'],
            ['branch_code' => 'OC35', 'name' => 'OSCAR CELL', 'address' => 'Sei Sipai Arah Tungkaran'],
            ['branch_code' => 'OC36', 'name' => 'SULAIMAN  CELL', 'address' => 'Peilahari'],
            ['branch_code' => 'OC37', 'name' => 'SULAIMAN  CELL', 'address' => 'Pelaihari'],
            ['branch_code' => 'OC38', 'name' => 'OSCAR CELL', 'address' => 'Veteran bjm'],
            ['branch_code' => 'OC39', 'name' => 'OSCAR CELL', 'address' => 'Cempaka banjarbaru'],
            ['branch_code' => 'OC 40', 'name' => 'SERENA CELL', 'address' => 'Pelaihari arah batakan'],
        ];

        foreach ($stores as $store) {
            Store::create($store);
        }
    }
}
