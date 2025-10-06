#!/bin/bash
# Ce script génère des fichiers audio simples pour les feedbacks sonores
# Utilise ffmpeg pour créer des sons simples

# Son "add" - bip court et agréable (440 Hz pendant 0.1s)
ffmpeg -f lavfi -i "sine=frequency=440:duration=0.1" -ar 44100 -ac 1 -y add.mp3 2>/dev/null

# Son "success" - deux bips ascendants (523 Hz puis 659 Hz)
ffmpeg -f lavfi -i "sine=frequency=523:duration=0.15,sine=frequency=659:duration=0.15" -ar 44100 -ac 1 -y success.mp3 2>/dev/null

# Son "error" - bip descendant (400 Hz à 200 Hz)
ffmpeg -f lavfi -i "sine=frequency=400:duration=0.2" -af "asetrate=44100*0.5,aresample=44100,atempo=2" -ar 44100 -ac 1 -y error.mp3 2>/dev/null

echo "Sons générés avec succès !"
