import { Component } from '@angular/core';
import { Header } from "../header/header";
import { Hero } from "../../hero/hero";
import { Navbar } from "../../navbar/navbar";

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [Header, Hero, Navbar],
  templateUrl: './main.html',
  styleUrl: './main.scss'
})
export class Main { }