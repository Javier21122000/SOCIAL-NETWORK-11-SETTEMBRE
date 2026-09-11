package javiertorres.be.service;
import javiertorres.be.model.Profilo;
import javiertorres.be.repository.ProfiloRepository;
import org.springframework.stereotype.Service;
import java.util.*;
@Service
public class ProfiloService {
    private final ProfiloRepository repository;
    public ProfiloService(ProfiloRepository repository) { this.repository = repository; }
    public Profilo updateFoto(UUID id, String url) { Profilo p = repository.findById(id).orElseThrow(); p.setFotoProfiloUrl(url); return repository.save(p); }
    public void removeFoto(UUID id) { Profilo p = repository.findById(id).orElseThrow(); p.setFotoProfiloUrl(null); repository.save(p); }
}
