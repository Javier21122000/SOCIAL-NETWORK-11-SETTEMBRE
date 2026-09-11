package javiertorres.be.controller;

import javiertorres.be.model.Profilo;
import javiertorres.be.service.ProfiloService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/profili")
public class ProfiloController {
    private final ProfiloService service;
    public ProfiloController(ProfiloService service) { this.service = service; }
    @PatchMapping("/{id}/foto")
    public ResponseEntity<Profilo> updateFoto(@PathVariable UUID id, @RequestParam("fotoProfiloUrl") String fotoProfiloUrl) {
        return ResponseEntity.ok(service.updateFoto(id, fotoProfiloUrl));
    }
    @DeleteMapping("/{id}/foto")
    public ResponseEntity<Void> removeFoto(@PathVariable UUID id) { service.removeFoto(id); return ResponseEntity.noContent().build(); }
}
